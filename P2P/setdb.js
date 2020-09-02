var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'Peers',
  supportBigNumbers: true,
  bigNumberStrings: false,
  multipleStatements: true
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  var que = "";
    que += `DROP TABLE if exists Rooms; DROP TABLE if exists connections;`
    que += `CREATE TABLE Rooms (
                doc TIMESTAMP,
                roomer VARCHAR(12),
                manifest MEDIUMTEXT
            );`
    que += `CREATE TABLE connections (
                doc TIMESTAMP,
                roomer VARCHAR(12),
                profile MEDIUMTEXT
            );DROP DATABASE peers`

  connection.query(que, (err, result)=>{
    console.log(err)
    console.log(result)
    connection.end()
  })

  console.log(mysql.raw('CURRENT_TIMESTAMP()').toSqlString())

  console.log('connected as id ' + connection.threadId);
});
