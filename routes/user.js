var md5 = require('md5');
var connection = require('../modules/connection');
var responses = require('../modules/responses');
var comFunc = require('../modules/commonFunction');

var _ = require('lodash');
var async = require('async');

// For signup
exports.signup = function(req, res) {

	var name = req.body.name;
	var email = req.body.email;
	var password = req.body.password;

	var manValue = [name, email, password];
	var checkBlank = comFunc.checkBlank(manValue);

	if ( checkBlank == 1 ) {
		responses.parameterMissing(res);
	} else {
		var sql = "SELECT * FROM `registration` WHERE `email`=?";
		connection.query(sql, [email], function(err, result){
			if ( err ) {
				responses.sendError(res);
			} else {
				if ( result.length > 0 ) {
					responses.emailAlreadyExist(res);
				} else {
					var user_id = md5(new Date());
					var access_token = md5(new Date());

					var insert_sql = "INSERT INTO `registration`(`user_id`, `access_token`, `name`, `email`, `password`) VALUES(?,?,?,?,?)";
					var values = [user_id, access_token, name, email, md5(password)];
					connection.query(insert_sql, values, function(err, result){
						if ( err ) {
							responses.sendError(res);
						} else {
							var sql = "SELECT * FROM `registration` WHERE `email`=?";
							connection.query(sql, [email], function(err, result){
								if ( err ) {
									responses.sendError(res);
								} else {
									result[0].password = "";
									responses.success(res, result[0]);
								}
							});
						}
					});
				}
			}
		});
	}
}
//login
exports.login = function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var access_token = md5(new Date());
    var access_token_update = "update `registration` set `access_token`=? WHERE `email`=?";
    var values = [access_token, email];
    connection.query(access_token_update, values, function(err, result) {
        if (err) {
            responses.sendError(res);
        } else {
            var sql = "SELECT * FROM `registration` WHERE `email`=? AND `password`=?";


            var values = [email, md5(password)];

            connection.query(sql, values, function(err, result) {
                console.log(result);
                if (err) {
                    responses.sendError(res);
                    return;
                } else {

                    if (result.length > 0) {
                        result[0].password = "";
                        responses.success(res, result[0]);
                        return;
                    } else {
                        responses.invalidCredential(res);
                        return;
                    }

                }
            });

        }
    });
}
//post
exports.post = function(req, res) {
    var arr = [];
    var post_text = req.body.post_text;
    var access_token = req.body.access_token;

    var manValue = [post_text, access_token];
    var checkBlank = comFunc.checkBlank(manValue);

    if (checkBlank == 1) {

        responses.parameterMissing(res);
    } else {
        var created_on = new Date();
        var post_id = md5(new Date());
        var sql = "SELECT `user_id` from `registration` WHERE `access_token`=?";
        connection.query(sql, [access_token], function(err, result) {
            if (err) {
                responses.sendError(res);
                } else {
                    var user_id = result[0].user_id;
                    console.log(user_id);
                    var status_sql = "INSERT INTO `post_details`(`post_id`,`post_text`,`user_id`, `created_on`) VALUES(?,?,?,?)";
                    var values = [post_id,post_text, user_id,created_on];
                connection.query(status_sql, values, function(err) {
                    if (err) {
                        console.log(err);
                        responses.sendError(res);
              } else {
                    let user_id = result[0].user_id;
                    var sql = "SELECT * FROM `post_details`";
                    connection.query(sql, [user_id], function(err, postList) {
                        if (err) {
                            responses.sendError(res);
                        } else {
                            async.eachSeries(postList, processData, function(err) {
                                if (err) {
                                    responses.sendError(res);
                                } else {
                                    responses.success(res, arr);
                                }
                            })

                            function processData(post, callback) {
                                let user_id = post.user_id;
                                var sql = "SELECT `name` FROM `registration` WHERE `user_id` = ?";
                                connection.query(sql, [user_id], function(err, result) {
                                    if (err) {
                                        responses.sendError(res);
                                    } else {
                                        arr.push(_.merge({
                                            name: result[0].name
                                        }, post));
                                        callback();
                                       }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
    }
}
// get post list
exports.get_post_list = function(req, res) {
    var access_token = req.body.access_token;
    var manValue = [access_token];
    var checkBlank = comFunc.checkBlank(manValue);
    let arr = [];
    if (checkBlank == 1) {
        responses.parameterMissing(res);
    } else {
        var user_sql = "SELECT * FROM `registration` WHERE `access_token`=?";
        connection.query(user_sql, [access_token], function(err, userresult) {
            if (err) {
                responses.sendError(res);
            } else {
                if (userresult.length == 0) {
                    responses.invalidAccessToken(res);
                } else {
                    let user_id = userresult[0].user_id;
                    var sql = "SELECT * FROM `post_details` ORDER BY `row_id` DESC";
                    connection.query(sql, [user_id], function(err, postList) {
                        if (err) {
                            responses.sendError(res);
                        } else {
                            async.eachSeries(postList, processData, function(err) {
                                if (err) {
                                    responses.sendError(res);
                                } else {
                                    responses.success(res, arr);
                                }
                            })

                            function processData(post, callback) {
                                let user_id = post.user_id;
                                var sql = "SELECT `name` FROM `registration` WHERE `user_id` = ?";
                                connection.query(sql, [user_id], function(err, result) {
                                    if (err) {
                                        responses.sendError(res);
                                    } else {
                                        arr.push(_.merge({
                                            name: result[0].name
                                        }, post));
                                        callback();
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    }
}
//like
exports.postLike = function(req, res) {

    var access_token = req.body.access_token;
    var post_id = req.body.post_id;
    var on_date = new Date();
    //console.log(access_token + "     " + post_id);
    var sql = "select * from `registration` WHERE `access_token` = ?";
    connection.query(sql, [access_token], function(err, result) {
        if (err) {
            responses.sendError(res);
        } else {
            var user_id = result[0].user_id;
           // console.log(user_id);
            var sql = "select * from `post_like` where `post_id` = ? AND `user_id` = ?"
            var values = [post_id, user_id];
            connection.query(sql, values, function(err, result) {
                if (err) {
                    responses.sendError(res);
                } else if (result.length > 0) {
                    var delsql = "delete from `post_like` where `user_id` = ? AND `post_id`=?"
                    var values = [user_id, post_id];
                    connection.query(delsql, values, function(err, result) {
                        if (err) {
                            responses.sendError(res);
                        } else {
                            //console.log("Post unlike and data deleted");
                            var msg = "post unlike";
                            responses.success(res,msg);
                        }
                    })
                } else {
                    console.log("working");
                    var insertsql = "insert into `post_like` (`user_id`,`post_id`,`on_date`) VALUES (?,?,?)";
                    var values = [user_id, post_id, on_date];
                    connection.query(insertsql, values, function(err, result) {
                        if (err) {
                            responses.sendError(res);
                        } else {
                           // console.log("post Liked and Data inserted")
                           var msg = "post like";
                           responses.success(res,msg);
                        }
                    })
                }
            })
        }
    })
}
    



