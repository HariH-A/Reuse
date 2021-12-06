var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'DonorDB'
});

var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/donationPage.html'));
});

app.post('/auth', function(request, response) {
	var donor={
        "donorName":request.body.donorName,
		"donationType" : request.body.donationType,
		"item" : request.body.item,
        "mailID":request.body.mailID,
        "phone":request.body.phone,
        "landMark":request.body.landMark,
		"pinCode":request.body.pinCode,
		"image":request.body.image
    }
	connection.query("SELECT * FROM donor where donorName = ? and mailID = ? and item = ? image = ?;",[request.body.donorName, request.body.mailID, request.body.item, request.body.image], function (err, result, fields) {
    if (err) throw err;
    console.log(result);
	});
	connection.query('INSERT INTO donor SET ?',donor, function(error, results, fields) {
		if (error) {
			response.json({
				status:false,
				message:'We have run into some inconvenience. Please try later.'
			})
		}else{
          response.json({
            //status:true,
            //data:results,
            message:'Donation registered sucessfully'
		  })
        }
    });
});
app.listen(3000);