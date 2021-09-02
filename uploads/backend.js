var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
const json = require('body-parser/lib/types/json');
const multer  = require('multer');
const AWS = require('aws-sdk');
const fs=require('fs');
const keys = require('./keys.js');

var app = express();
app.use(session({
    secret:'secret',
    resave : true,
    saveUninitialized:true,
    cookie:{maxAge:60000}
}));


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json())

var connection = mysql.createConnection({
	host     : 'SG-ca4projectsqlserver-4893-mysql-master.servers.mongodirector.com',
	user     : 'nodejsuser',
	password : 'Password@123',
	database : 'cloudcomputing'
});


// configuring the DiscStorage engine.
// const storage = multer.diskStorage({
//   destination : 'uploads/',
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   }
// });
// const upload = multer({ storage: storage });

var storage =   multer.diskStorage({  
  destination: function (req, file, callback) {  
    callback(null, './uploads');  
  },  
  filename: function (req, file, callback) {  
    callback(null, file.originalname);  
  }  
});  
var upload = multer({ storage : storage}).single('myfile');  
  

//setting the credentials
//The region should be the region of the bucket that you created
//Visit this if you have any confusion - https://docs.aws.amazon.com/general/latest/gr/rande.html
AWS.config.update({
  accessKeyId: keys.iam_access_id,
  secretAccessKey: keys.iam_secret,
  region: 'us-east-2',
});

//Creating a new instance of S3:
const s3= new AWS.S3();

//POST method route for uploading file

// app.post('/post_file', upload.single('demo_file'), function (req, res) {
// //Multer middleware adds file(in case of single file ) or files(multiple files) object to the request object.
// //req.file is the demo_file
// console.log(req.session);
// console.log('--------------------------------------------');
// console.log(req.body);
// uploadFile(req.file.path, req.file.filename ,res);
// })

app.post('/post_file',function(req,res){  
  upload(req,res,function(err) {  
      if(err) {  
          return res.end("Error uploading file.");  
      }  
      uploadFile(req.file.path, req.file.filename ,res);
      // res.end("File is uploaded successfully!");  
  });  
});  


//GET method route for downloading/retrieving file
app.get('/get_file/:file_name',(req,res)=>{
retrieveFile(req.params.file_name, res);
});


app.get('/signup', function(request, response){
    response.sendFile(path.join(__dirname + '/signup.html'));
});
app.get('/login', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/',function(request, response){
    response.sendFile(path.join(__dirname + '/signup.html'));
    // response.send("<div><a href='/login'>click here for login</a> <br/> <a href='/signup'>click here for signup</a> </div>");
});

app.post('/cauth',function(request, response){
	var username = request.body.username;
	var password = request.body.password;
    var email = request.body.email
    console.log( "username and password "+username +" "+ password)
	if (username && password.length>8 && email) {
		connection.query('INSERT INTO accounts ( username, password, email) VALUES (?,?,?)' , [username, password,email], function(error, results, fields) {
			console.log("results");
            console.log(results);
            console.log("error");
            console.log(error);
            if (!error){
            response.redirect('/login');
            }
            else{
                response.send({"error ": error})
            }
            
            // if (results.length > 0) {
			// 	// request.session.loggedin = true;
			// 	// request.session.username = username;
                
			// } else {
			// 	response.send('username and/or Password!');
			// }
		});
	} else {
		response.send({'error':'Please enter Username and Password!'});
		// response.end();
	}
});

app.post('/auth', function(request, response) {
  // console.log(request)
	var username = request.body.username;
	var password = request.body.password;
    console.log( "username and password "+username +" "+ password)
	if (username && password) {
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			console.log(results);
            if (results.length > 0) {
                
				request.session.loggedin = true;
				request.session.username = username;
				
                response.redirect('/home');
                
			} else {
				response.send('Incorrect Username and/or Password!');
			}
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.get('/home', function(request, response) {
	if (request.session.loggedin) {
		// response.send('Welcome back, ' + request.session.username + '!');
    response.sendFile(path.join(__dirname + '/home.html'));
	} else {
    response.sendFile(path.join(__dirname + '/login.html'));
		// response.send('Please login to view this page!');
	}
	
});

var port=3000;
app.listen(port,()=>{console.log(`what are you doing app has started !!! \n http://localhost:${port}`)});



//The uploadFile function
function uploadFile(source,targetName,res){
  console.log('preparing to upload...');
  fs.readFile(source, function (err, data) {
      if(err) {
          console.log('error', err);
          return res.send({success:false})
      }
      else{
          const putParams = {
              Bucket      : 'hostit1',
              Key         : targetName,
              Body        : data
              
          };
          s3.putObject(putParams, function(err, data){
              if(err){
                  return res.send({success:false,error:err})
              }
              else{
                  // fs.unlink(source);// Deleting the file from uploads folder(Optional).Do Whatever you prefer.
                  console.log('Successfully uploaded the file');
                  return res.send({success:true});
              }    
          });
          // return res.send({success:true})
      }
  //   if (!err) {
  //     const putParams = {
  //         Bucket      : 'hostit1',
  //         Key         : targetName,
  //         Body        : data
  //     };
  //     s3.putObject(putParams, function(err, data){
  //       if (err) {
  //         console.log('Could nor upload the file. Error :',err);
  //         return res.send({success:false});
  //       } 
  //       else{
  //         fs.unlink(source);// Deleting the file from uploads folder(Optional).Do Whatever you prefer.
  //         console.log('Successfully uploaded the file');
  //         return res.send({success:true});
  //       }
  //     });
  //   }
  //   else{
  //     console.log({'err':err});
  //   }
  });
}

//The retrieveFile function
function retrieveFile(filename,res){

const getParams = {
  Bucket: 'hostit1',
  Key: filename
};

s3.getObject(getParams, function(err, data) {
  if (err){
    return res.status(400).send({success:false,err:err});
  }
  else{
    return res.write(data.Body);
  }
});
}