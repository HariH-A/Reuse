var express=require("express");
var bodyParser=require('body-parser');
var session = require('express-session');
var path = require('path');
var Cryptr = require('cryptr');
var nodemailer = require('nodemailer');
var expressLayouts = require('express-ejs-layouts');
var cors = require('cors');
var alert = require('alert');

cryptr = new Cryptr('myTotalySecretKey');
var connection = require('./config');

var app = express();
app.use(session({
  secret: 'secret',
  cookie: {maxAge: 600000},
  resave: true,
  saveUninitialized: true
}
));
//app.use(cookieParser);
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(cors());
app.set('view engine','ejs');

app.get('/', function (req, res) {
   res.sendFile(path.join( __dirname + "/register.html") );  
}); 

app.get('/login.html', function (req, res) {  
  res.sendFile(path.join( __dirname + "/login.html") );  
});

app.get('/donations', function (request, response){
  response.render(path.join(__dirname+'/views/donations'), {
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
});

app.get('/authOTP', function (request, response){
  response.render(path.join(__dirname+'/views/authOTP'), {
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
});

app.post('/donationForm', function(request, response) {
	response.render(path.join(__dirname + '/views/donationForm'), {
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
});

app.post('/register', function(req, res){
   var encryptedString = cryptr.encrypt(req.body.password);
   var users={
        "name":req.body.name,
        "email":req.body.email,
		    "phone":req.body.phone,
        "password":encryptedString,
        }
    connection.query('INSERT INTO users SET ?',users, function (error, results, fields) 
	{
      if (error) {
        console.log("status:false, message:there are some error with query");

      }else{
          console.log("status:true, data:results,message:user registered sucessfully");
            res.redirect("/login.html");
      }
    });
});

 
app.post('/authenticate', function(req, res){
    var email=req.body.email;
    var password=req.body.password;
   
   
    connection.query('SELECT * FROM users WHERE email = ?',[email], function (error, results, fields) 
	{
      if (error) {
          console.log("status:false,message:'there are some error with query");
      }else{
       
        if(results.length >0){
            decryptedString = cryptr.decrypt(results[0].password);
            if(password==decryptedString){
                console.log("status:true, message:successfully authenticated");
                req.session.loggedin = true;
                req.session.email = results[0].email;
                req.session.phone = results[0].phone;
                req.session.name = results[0].name;
                req.session.save();
                
                console.log(session.email);
                console.log(session.phone);
                console.log(session.name);

                res.redirect('donations');

            }else{
                console.log("status:false,message:Email and password does not match");
                alert('Email and password does not match');
                 res.redirect('/login.html');
            }
          
        }
        else{
          console.log("status:false, message:Email does not exits");
          alert('Email-ID does not exits. redirect to register page')
          res.redirect('/');
        }
      }
    });
});


var transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
    port: 465,
    secure: true,
	service: 'Gmail',
	auth: {
	  user: 'reusedonation@gmail.com',
	  pass: 'SDL@project'
	}
  });

var email;
var otp = Math.random();
otp = otp * 1000000;
otp = parseInt(otp);
console.log(otp);


app.post('/sendOTP', function(request, response){
	
  request.session.donationType = request.body.donationType;
  request.session.item = request.body.item;
  request.session.landMark = request.body.landMark;
  request.session.pinCode = request.body.pinCode;
  request.session.output = request.body.output;
  request.session.save();
    
  email = request.session.email;
  
	var mailOptions = {
		from: 'reusedonation@gmail.com',
		to: email,
		subject: 'Donation confirmation',
		html: "<h3>OTP to confirm your donation is </h3>"  + "<h1 style='font-weight:bold;'>" + otp +"</h1>" // html body
	  };

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
		  console.log(error);
		  alert('You have not yet registered with your email: '+ email+'. Register in to donate');
		  response.redirect('/')
		} else {
		  console.log('Email sent: ' + info.response);
		  console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
		  response.redirect('authOTP');
		}
	  });

});

app.post('/verifyOTP',function(req,res){

    if(req.body.otp==otp){
        alert("Donated Successfully");
        res.redirect('donate');
    }
    else{
		alert("Incorrect OTP");
        res.redirect('authOTP');
    }
});  

app.get('/donate', function(request, response) {
	var donation = {
    "donationType" : request.session.donationType,
		"item" : request.session.item,
    "landMark": request.session.landMark,
		"pinCode": request.session.pinCode,
		"image": request.session.output
    }
	
	connection.query('INSERT INTO donor SET ?',donation, function(error, results, fields) {
		if (error) {
			console.log('status:false, message: We have run into some inconvenience. Please try later.');
			response.send(error);
		}else{
			console.log('status:true, data:results, message: Donation registered sucessfully');
			response.send(error);
      }
    });
});
app.listen(3000);
