var express=require("express");
var bodyParser=require('body-parser');
var session = require('express-session');
var path = require('path');
var Cryptr = require('cryptr');
var nodemailer = require('nodemailer');
var cors = require('cors');
var alert = require('alert');
var multer = require('multer');
const ejsLint = require('ejs-lint');
cryptr = new Cryptr('myTotalySecretKey');
var fs = require('fs');
var https = require("https");
var connection = require('./config');

var app = express();

//app.use(cookieParser);
app.use(session({
  secret: 'secret',
  cookie: {maxAge: 600000},
  resave: true,
  saveUninitialized: true
}
));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(cors());
app.set('view engine','ejs');
app.use(express.static(path.join(__dirname + "/images")));

var upload = multer({
  storage: multer.memoryStorage()
});

const sslServer = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.crt')),
  },
  app
)
sslServer.listen(3000, () => console.log(`SSL server is running at https://localhost:3000`))

app.get('/', function (request, response) {
  response.sendFile(path.join( __dirname + "/home.html") );  
}); 


app.get('/register.html', function (request, response) {
   response.sendFile(path.join( __dirname + "/register.html") );  
}); 

app.get('/login.html', function (request, response) {  
  response.sendFile(path.join( __dirname + "/login.html") );  
});

app.get('/donations', function (request, response){
  if(!request.session.email){
    response.redirect('/login.html');
  }
  connection.query("SELECT * FROM donation WHERE isAccepted=0",(err,rows,fields)=>{
    if (err) throw err
  
  response.render(path.join(__dirname+'/views/donations'), {
    donations : rows,
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
  })
});

app.get('/NEWdonations', function (request, response){
  let donorEmail = request.session.donorEmail;
  connection.query("SELECT * FROM donation WHERE email=?",[donorEmail],(err,rows,fields)=>{
    if (err) throw err
  else{
    response.render(path.join(__dirname+'/views/NEWdonations'), {
      donations : rows,
      name : rows[0].name,
      email: rows[0].email,
      phone: rows[0].phone  
  });
}
  })
});

app.get('/authOTP', function (request, response){
  if(!request.session.email){
    response.redirect('donationForm')
  }
  response.render(path.join(__dirname+'/views/authOTP'), {
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
});

app.get('/NEWauthOTP', function (request, response){
  response.render(path.join(__dirname+'/views/NEWauthOTP'), {
    name : request.session.donorName,
    email: request.session.donorEmail,
  });
});

app.get('/acceptedDonations', function (request, response){
  let acceptorEmail = request.session.email;
  if(!request.session.email){
    response.redirect('/login.html');
  }
  connection.query("SELECT * FROM donation WHERE isAccepted=1 and acceptorEmail =?",[acceptorEmail],(err,rows,fields)=>{
    if (err) throw err
  response.render(path.join(__dirname+'/views/acceptedDonations'), {
    donationsAccepted : rows,
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
  })
});


app.get('/donationForm', function(request, response) {
  if(!request.session.email){
    response.redirect('/login.html');
  }
  response.render(path.join(__dirname + '/views/donationForm'), {
    name : request.session.name,
    email: request.session.email,
    phone: request.session.phone
  });
});

app.get('/NEWdonationForm.html', function (request, response) {  
  response.sendFile(path.join( __dirname + "/NEWdonationForm.html") );  
});

app.get('/NEWgetEmail.html', function (request, response) {  
  response.sendFile(path.join( __dirname + "/NEWgetEmail.html") );  
});

app.post('/NEWverifyEmail', function (request, response){
  let donorEmail = request.body.donorEmail;
  request.session.donorEmail = donorEmail;
  console.log("DonorEmail: "+ donorEmail);
  connection.query("SELECT * FROM donation WHERE email = ?", [donorEmail], (error,result,fields)=>{
  if(donorEmail === result[0].email){
      response.redirect('NEWdonations');
    }
  else if(donorEmail !== result[0].email){
      alert("There is no donations in this Email ID");
      response.redirect('/NEWgetEmail.html');
    }
  })
})

app.post('/sendFeedBack', function(request,response){
  let feedEmail = request.body.Email;
  let feedName = request.body.Name;
  let feedMess = request.body.Message;
  
  var mailOptions = {
		from: 'reusedonation@gmail.com',
		to: 'reusedonation@gmail.com',
		subject: 'Feedback from '+ feedName,
		html:  "<strong>Feedback Details</strong>"
      +"<br>Name: "+ feedName
      +"<br>Email: "+ feedEmail
      +"<br>Mess: "+ feedMess
	  };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) throw error
    else{
      alert("Feedback submitted sucessfully. Thank you!")
      response.redirect('/');
    }});
})

app.post('/register', function(request, response){
  
   let initAccepted = 0; 
   var encryptedString = cryptr.encrypt(request.body.password);
   var user={
        "name":request.body.name,
        "email":request.body.email,
		    "phone":request.body.phone,
        "password":encryptedString,
        "lastAccepted": initAccepted
        }
        let userEmail = request.body.email;
        connection.query('SELECT * from user WHERE email = ?',[userEmail], function (error, results, fields){
          let Email = results.email;
          console.log(Email);
          if( Email == userEmail){
             alert('Email Id already exists! Provide another Email ID or Go to Login with the same Email ID');
             response.redirect('/register.html');
          }
          else if(!error){ 
            connection.query('INSERT INTO user SET ?',user, function (error, results, fields){
              if (error) {
                console.log("status:false, message:there are some error with query");
                 response.redirect('/register.html');
              }else{
                  console.log("status:true, data:results,message:user registered sucessfully");
                     response.redirect("/login.html");
              }
            });
          }
        });
});

 
app.post('/authenticate', function(request, response){
    var email=request.body.email;
    var password=request.body.password;

    connection.query('SELECT * FROM user WHERE email = ?',[email], function (error, results, fields) 
	{
      if (error) {
          console.log("status:false,message:'there are some error with query");
      }else{
       
        if(results.length >0){
            decryptedString = cryptr.decrypt(results[0].password);
            if(password==decryptedString){
                console.log("status:true, message:successfully authenticated");
                request.session.loggedin = true;
                request.session.email = results[0].email;
                request.session.phone = results[0].phone;
                request.session.name = results[0].name;
                request.session.save();
                
                console.log(request.session.email);
                console.log(request.session.phone);
                console.log(request.session.name);

                response.redirect('donations');

            }else{
                console.log("status:false,message:Email and password does not match");
                alert('Email and password does not match');
                 response.redirect('/login.html');
            }
          
        }
        else{
          console.log("status:false, message:Email does not exits");
          alert('Email-ID does not exists')
          response.redirect('/register.html');
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
	  pass: 'pragrbyesfhpbuii'
	}
  });

  var email;
  
app.post('/sendOTP',upload.single('image'), function(request, response){
	if (!request.file) {
    alert("Donation Item Image not uploaded");
    response.redirect('donations');
} else {
  request.session.donationType = request.body.donationType;
  request.session.item = request.body.item;
  request.session.landMark = request.body.landMark;
  request.session.pinCode = request.body.pinCode;
  request.session.imageSource = request.file.filename;
  request.session.image = request.file.buffer.toString('base64');
  request.session.save();

  var otp = Math.floor(100000 + Math.random() * 99999);
  request.session.otp = parseInt(otp);
  console.log(otp);

  const d = new Date();
  let time = d.getTime();
  let dID = request.session.email+"_"+time;
  let acceptValue = 0;
  let acceptorPhone = 0;
  donation = {
    "donationID": dID,
    "name" : request.session.name,
    "email" : request.session.email,
    "phone" : request.session.phone,
    "donationType": request.body.donationType,
    "item": request.body.item,
    "landMark": request.body.landMark,
    "pinCode": request.body.pinCode,
    "donationDescription" : request.body.donationDescription,
    "isAccepted" : acceptValue,
    "acceptorName": 'NIL',
    "acceptorEmail": 'NIL',
    "acceptorPhone": acceptorPhone,
    "image" : request.file.buffer.toString('base64')
  }
  request.session.donation = donation;
  email = request.session.email;
  request.session.save()

	var mailOptions = {
		from: 'reusedonation@gmail.com',
		to: email,
		subject: 'Donation confirmation',
		html:  "<h3>Hi " + request.session.name +",</h3><h3> OTP to confirm your donation in Donation portal is </h3>"  + "<h1 style='font-weight:bold;'>" + otp +"</h1>" // html body
	  };

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
		  console.log(error);
		  alert('You have not yet registered with your email: '+ email);
		  response.redirect('/register.html')
		} else {
		  console.log('Email sent: ' + info.response);
		  console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      response.redirect('authOTP');
		}
	  });
  }
});
  
app.post('/NEWsendOTP',upload.single('image'), function(request, response){
	if (!request.file) {
    alert("Donation Item Image not uploaded");
} else {
  let donorName = request.body.name;
  let donorEmail = request.body.email;
  let donorPhone = request.body.phone;
  var donationType = request.body.donationType;
  var item = request.body.item;
  var landMark = request.body.landMark;
  var pinCode = request.body.pinCode;
  var imageSource = request.file.filename;
  var image = request.file.buffer.toString('base64');
  
  request.session.donorEmail = donorEmail;
  request.session.donorPhone = donorPhone;
  request.session.donorName = donorName;
                

  var otp = Math.floor(100000 + Math.random() * 99999);
  request.session.otp = parseInt(otp);
  console.log(otp);
  const d = new Date();
  let time = d.getTime();
  let dID =  donorEmail+"_"+time;
  let isAccepted = 0;
  let acceptorPhone =0

  NEWdonation = {
    "donationID": dID,
    "name" :  request.body.name,
    "email" :  request.body.email,
    "phone" :  request.body.phone,
    "donationType": request.body.donationType,
    "item": request.body.item,
    "landMark": request.body.landMark,
    "pinCode": request.body.pinCode,
    "donationDescription" : request.body.donationDescription,
    "isAccepted" : isAccepted,
    "acceptorName": 'NIL',
    "acceptorEmail": 'NIL',
    "acceptorPhone": acceptorPhone,
    "image" : request.file.buffer.toString('base64')
  }
   request.session.NEWdonation = NEWdonation;
   donorEmail = request.body.email;
  
	var mailOptions = {
		from: 'reusedonation@gmail.com',
		to: donorEmail,
		subject: 'Donation confirmation',
		html:  "<h3>Hi " +  request.body.name + 
    ",</h3><h3> OTP to confirm your donation in Donation portal is </h3>"  
    + "<h1 style='font-weight:bold;'>" + otp +"</h1>"
	  };

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
      console.log(error);
    }
    else {
		  console.log('Email sent: ' + info.response);
		  console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      response.redirect('NEWauthOTP');
		}
	  });
  }
});

app.post('/verifyOTP',function(request,response){
    if(request.body.otp == request.session.otp) {
        alert("Donated Successfully");
        response.redirect('donate');
    } else{
		alert("Incorrect OTP");
        response.redirect('authOTP');
    }
});  

app.post('/NEWverifyOTP',function(request,response){
  if(request.body.otp == request.session.otp) {
    alert("Donated Successfully");
    response.redirect('NEWdonate');
} else{
alert("Incorrect OTP");
    response.redirect('NEWauthOTP');
}
});   

app.get('/donate',upload.single('image'), function(request, response) { 
	connection.query('INSERT INTO donation SET ?', request.session.donation,(error, results, fields)=> {
		if (error) throw error
      response.redirect('donations');
    });
});

app.get('/NEWdonate',upload.single('image'), function(request, response) { 
	connection.query('INSERT INTO donation SET ?', request.session.NEWdonation,(error, results, fields)=> {
		if (error) throw error
      response.redirect('NEWdonations');
    });
});

app.post('/acceptDonation', function(request, response){
  var radioID = request.body.radioID;  
  var acceptorEmail = request.session.email;
  console.log(radioID, acceptorEmail);
    connection.query('SELECT * FROM donation where donationID = ?', [radioID],(error, results, fields)=> {
      if (error) throw error
    else{
      console.log(acceptorEmail);
      connection.query('SELECT * FROM user where email = ?', [acceptorEmail],(error, result, fields)=> {
        if (error) throw error
        else{
          const d = new Date();
          let timeNow = d.getTime();
          let timeAccepted = result[0].lastAccepted;
          let timeInterval = 3600000;
          let timeDiff = timeNow - timeAccepted;
          console.log(timeDiff);

          if(timeDiff <= timeInterval){
            alert('Sorry! You can accept donations only after an hour of your previous acceptance');
            response.redirect('donations');
          }
          else if(timeDiff > timeInterval){
      
      var acceptorName = request.session.name;
      var accpetorPhone = request.session.phone; 
      console.log(acceptorEmail, acceptorName, accpetorPhone, radioID);

      connection.query("UPDATE user SET lastAccepted = ?",[timeNow],(error, res, fields)=> {
        if (error) throw error });
            
      connection.query("UPDATE donation SET isAccepted=1, acceptorName=?, acceptorEmail=?, acceptorPhone=? WHERE donationID = ?",[acceptorName, acceptorEmail, accpetorPhone, radioID],(error, res, fields)=> {
        if (error) throw error
        else{
        var mailOptions = {
        from: 'reusedonation@gmail.com',
        to: results[0].email,
        subject: "Donation item - "+results[0].item + " was accepted",
        html: "Donation item "+results[0].item+ " which you have posted in Donation portal have been accepted.<br><br> <strong>Acceptor details</strong> <br> Name: "
        + acceptorName + "<br> Email: " + acceptorEmail + "<br> Phone: "+ accpetorPhone +
         "<br><br><br> <strong>NOTE: Please remove your donation once it has been collected by the acceptor.</strong>"
      };
      transporter.sendMail(mailOptions, function(error, info){
        if (error) throw error
         else {
          console.log('Email sent: ' + info.response);
          console.log('Message sent: %s', info.messageId);   
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
          response.redirect('acceptedDonations');
        }
      })
      }         
    });
    }
    
  }
      
})           

  }
      
  })

});


app.post('/rejectDonations', function(request, response) { 
  var radioID = request.body.radioID;  
  var acceptorEmail = request.session.email;
  connection.query('SELECT * FROM donation where donationID = ?', [radioID],(error, results, fields)=> {
    if (error) throw error
  
  connection.query("UPDATE donation SET isAccepted=0, acceptorEmail='NIL' WHERE donationID = ?",[radioID],(error, res, fields)=> {
    if (error){
      response.send(error);
    }
    else{
      console.log('Rejected Sucessfully');
      connection.query('SELECT * FROM user where email = ?', [acceptorEmail],(error, result, fields)=> {
        if (error) throw error
        else{
          let timeAccepted = result[0].lastAccepted;
          let timeInterval = 3600000;
          let timeUpdated = timeAccepted - (timeInterval+1);
          console.log(timeUpdated);

      connection.query("UPDATE user SET lastAccepted = ?",[timeUpdated],(error, res, fields)=> {
        if (error) throw error       
       else{
        var mailOptions = {
        from: 'reusedonation@gmail.com',
        to: results[0].email,
        subject: "Donation item - "+results[0].item + " accepted was cancelled",
        html: "Donation item "+results[0].item+ " which was accepted earlier has been turned down." 
        + "<br> <strong>Donation Item Details</strong> <br>"
        + "Item: " + results[0].item
        + "<br>Catgory: " + results[0].donationType
        + "<br>Donation Description: " + results[0].donationDescription 
      };
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          response.write(error);
        } else {
          console.log('Email sent: ' + info.response);
          console.log('Message sent: %s', info.messageId);   
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
          response.redirect('acceptedDonations');
        }
      })
      }    
      });     
  }
      
})    
    }
  });
  
});

});

app.post('/NEWrejectAcceptance', function(request, response) { 
  var radioID = request.body.radioID;

  connection.query("UPDATE donation SET isAccepted=0, acceptorName='NIL', acceptorEmail='NIL', acceptorPhone=0 WHERE donationID = ?",[radioID],(error, res, fields)=> {
    if (error){
      response.send(error);
    }
    else{
      console.log('Acceptance Rejected Sucessfully');
      response.redirect('NEWdonations');
    }
  })
});

app.post('/NEWdeleteDonation', function(request, response) { 
  var radioID = request.body.radioID;

  connection.query("DELETE FROM donation WHERE isAccepted=1 AND donationID = ?",[radioID],(error, res, fields)=> {
    if (error){
      response.send(error);
    }
    else{
      console.log('Donation Deleted Sucessfully');
      response.redirect('NEWdonations');
    }
  })
});

app.post('/NEWremoveDonation', function(request, response) { 
  var radioID = request.body.radioID;

  connection.query("DELETE FROM donation WHERE isAccepted=0 AND donationID = ?",[radioID],(error, res, fields)=> {
    if (error){
      response.send(error);
    }
    else{
      console.log('Donation Removed Sucessfully');
      response.redirect('NEWdonations');
    }
  })
});

app.get('/logout',function(request,response){   
  request.session.destroy((err) => {  
      if(err){  
          console.log(err);  
      }  
      else  
      {  
          response.redirect('/');  
      }  
})
});
