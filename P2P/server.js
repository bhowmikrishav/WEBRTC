var fs = require('fs');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var JWT = require('jsonwebtoken')
var formidable = require('formidable');
var cookieParser = require('cookie-parser');
var formidable = require('formidable')

app.use(cookieParser())
app.use(require('express').static('public'))

app.get("/", (req, res)=>{
    res.sendfile('./model/index.html')
})
app.get("/favicon.ico", (req,res)=>{res.sendfile("./public/logo.png")})

var total_rooms = Math.floor(Math.random()*200)

app.post("/room", (req,res)=>{
    const form = formidable({ multiples: true });
    form.parse(req, async (err, fields, files)=>{
        if(err){res.send({err:true, err_msg:"bad req"}); return;}

        try{
            var html = await fs.readFileSync("./model/room_made.html", 'utf8')
            
            if(req.cookies["room_admin"]!=undefined){
                var room_link = JWT.verify(req.cookies["room_admin"], "")
                var croom = await Room.getRoom(room_link.joined)
                if(croom!=null){
                    console.log(31)
                    res.writeHead(200, { 'content-type': 'text/html' })
                    res.end(html.replace(/\<_room_link_direct_\>/, JWT.sign({name:croom.name, roomer:croom.roomer, password:croom.password}, "")))
                    return;
                }
            }

            const room = await Room.mkroom(fields.rn, fields.rp)

            res.cookie("room_admin", JWT.sign({joined:room.roomer}, "MochinMonestery"), {maxAge:60*60000})
            res.writeHead(200, { 'content-type': 'text/html' })
            res.end(html.replace(/\<_room_link_direct_\>/, room.join_link_direct))

        }catch(e){
            res.end("Something went worng :-("+e)
        }
    })
})

app.get("/room/\*", async (req, res)=>{
    try{
        const token = JWT.verify( req.url.substring(6,req.url.length), "")
        console.log(token)
        if(token.password != undefined){
            const room = await Room.getRoom(token.roomer)
            if(room.password != token.password){
                throw Error("Bad link")
            }
            const stamp = Room.roomStamp(room)
            var html = await fs.readFileSync('./model/p2p.html', 'utf8')
            res.end(html.replace(/<_room_manifest_>/, JSON.stringify(stamp)))
        }
    }catch(e){
        res.send(`Something went wrong:-(${e}) `)
    }
})

io.on('connect', (socket)=>{

    var con_manif = {
        touch:Date.now(),
        joined:false
    }

    socket.emit("connected", {})

    socket.on('join', async (fields)=>{
        try{
            if(con_manif.joined){throw Error("again!")}
            const token = JWT.verify(fields.jwt, "")
            var con = await Room.joinRoom(fields.name, fields.pid, token.roomer, token.password)
            con_manif["roomer"] = con["roomer"]
            con_manif["pid"] = fields.pid
            con_manif["joined"] = true
            socket.emit("join", {real_jwt:JWT.sign( con, "real_jwtroomer_roomie")})
            
        }catch(e){
            socket.emit("error", `Err : ${e}`)
        }
    })

    socket.on('disconnect', () => {
        console.log("honor94")
        kill_socket()
    });
    
    socket.on('alive', (data) =>{
        if((Date.now() - con_manif.touch)<2000){
            //kill_socket()
        }
        con_manif.touch = Date.now()
    })

    const int = setInterval(async ()=>{
        if((con_manif.touch + 30000 ) < Date.now()){
            console.log(this.con_manif.touch + "timeout")
            kill_socket()
        }
        //more events
        if(con_manif.joined){
            const info = await Room.room_info(con_manif["roomer"])
            socket.emit("room_status", info)
        }

    }, 5000)

    async function kill_socket(){
        console.log("killing")
        try{
            try{clearInterval(int)}catch{}
            socket.disconnect();
            await socket.removeAllListeners();
            socket = null; //this will kill all event listeners working with socket
            //set some other stuffs to NULL
            console.log(con_manif)
            if(con_manif.joined)
            Room.kill_conn( con_manif["pid"])
        }
        catch(e){
            console.log(e+"went worng")
        }
    }
})

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://Host:Password@cluster0-vqu1p.mongodb.net/<dbname>?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: false });
var rooms, connections;
client.connect(err => {
    if(err){
        throw err;
    }
  rooms = client.db("P@P").collection("rooms");
  connections = client.db("P@P").collection("connections");
  //server.listen(8080)
  server.listen(process.env.PORT)
  console.log("Hola onlino")
});

const SQL_CON_CONFIG = {
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'Peers',
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: true
  }

class Room{

    static async getRoom(roomer){
        return new Promise((resolve, reject)=>{
            try{
                rooms.findOne({roomer:roomer}, (err, result)=>{
                    if(err){
                        reject(`DB Error : ${err}`); return;
                    }
                    resolve(result)
                })
            }catch(e){
                reject(`DB Error : ${e}`)
            }
        })
    }

    static roomStamp(room){
        return { 
            roomer : room.roomer,
            name : room.name,
            join_link : JWT.sign({name:room.name, roomer:room.roomer}, ""),
            join_link_direct : JWT.sign({name:room.name, roomer:room.roomer, password:room.password}, ""),
        }
    }

    static mkroom(name, password){
        return new Promise(async (resolve, reject)=>{
            try{
                if(name.length > 30){reject("bad input"); return}

                const roomer = `${Date.now()}${(total_rooms++)}${Math.floor(Math.random()*1000000000)}`.substr(0,12)
                name = name.match(/([0-9])|([a-z])|([A-Z])/g).join('')

                rooms.insertOne(
                    {
                        roomer : roomer,
                        doc: Date.now(),
                        password : password,
                        name : name,
                    }, (err)=>{
                        if(err){
                            reject(err); return;
                        }
                        resolve(
                            { 
                                roomer : roomer,
                                join_link : JWT.sign({name:name, roomer:roomer}, ""),
                                join_link_direct : JWT.sign({name:name, roomer:roomer, password:password}, ""),
                            }
                        )
                    }
                )

            }catch(e){
                reject(`DB Error : ${e}`)
            }
        })
    }

    static joinRoom(name, pid, roomer, password){
        console.log(name, pid, roomer, password)
        return new Promise((resolve, reject)=>{
            try{
                if(     (typeof name != "string")
                    ||  (typeof pid != "string")
                    ||  (typeof roomer != "string")
                    ||  (typeof password != "string")
                    ){
                    throw Error("bad request")
                }

                rooms.findOne({roomer}, (err, result)=>{
                    if(err){
                        reject(err); return;
                    }
                    if(result == null){
                        reject(Error("room not found")); return;
                    }
                    connections.insertOne(
                        {
                            pid:pid,
                            roomer:roomer,
                            name:name,
                            joined_at: Date.now()
                        }, (err, result)=>{
                            if(err){
                                reject(err); return;
                            }
                            resolve(
                                {
                                    _id : result._id, roomer : roomer
                                }
                            )
                        }
                    )
                })
            }catch(e){
                reject(e)
            }
        })
    }

    static kill_conn(_id){
        console.log("kill"+_id)
        connections.findOneAndDelete({pid:_id}, (err, res)=>{
            if(err){return}
            console.log("done")
        })
    }

    static room_info(roomer){
        return new Promise((resolve, reject)=>{
            try{
                if(typeof roomer!="string"){
                    throw Error("bad input")
                }
                rooms.findOne({roomer}, (err, result)=>{
                    if(err){
                        reject(err); return
                    }
                    if(result == null){
                        resolve({room:'dead'}); return
                    }
                    connections.find({roomer:roomer}).toArray((err, results)=>{
                        if(err){
                            reject(err); return
                        }
                        for(var i in results){
                            delete results[i]._id
                        }
                        resolve({room:"alive", peers:results})
                    })
                })
            }catch(e){
                reject(e)
            }
            
        })
    }

}
