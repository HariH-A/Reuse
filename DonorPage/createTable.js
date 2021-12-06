var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "DonorDB"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  var sql = "CREATE TABLE donor (donorName VARCHAR(255) NOT NULL, donationType VARCHAR(100) NOT NULL, item VARCHAR(255) NOT NULL, mailID VARCHAR(100) NOT NULL, phone BIGINT(10) NOT NULL,landMark VARCHAR(255) NOT NULL, pinCode BIGINT(6) NOT NULL, image BLOB NOT NULL);";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
});