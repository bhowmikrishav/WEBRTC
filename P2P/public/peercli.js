var getUserMedia = null;
var main_stream = null;
function startCamera() {
    getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    getUserMedia({video: true, audio: true}, function(stream) {
        mecamera.srcObject = stream
        main_stream = stream;
        mecamera.play()
        startcamera.hidden = true;
    })
}
var iceServers={
	'iceServers':[
		{'url':'stun:stun.services.mozilla.com'},
		{'url':'stun:stun.l.google.com.19302'}
	]
  }
const peer = new Peer(iceServers);
var peerid = null;
peer.on('open', function(id) {
    peerid = id;
    join.removeAttribute('disabled')
    startcamera.removeAttribute('hidden')
});

function togglefullScreen(elem){
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
}

socket.on('error', (err)=>{
    alert(err)
})

function joinSession(name) {
    try{join.disabled = true
        const fields = {
            name : name,
            pid : peerid,
            jwt : room_manifest.join_link_direct
        }
        M.toast({html: 'Joining'});
        socket.on('join', (data)=>{
            onjoin(data.real_jwt)
        })
        var int = setInterval(()=>{
            try{
                console.log("upy"+Date.now())
                if(socket.connected){
                    clearInterval(int)
                    socket.emit("join", fields)
                }
                
            }catch{
            }
        }, 3000)
    }catch(e){
        console.error(e)
        alert("something went wrong")
    }
}

function onjoin(real_jwt) {
    M.toast({html: 'Success'});
    mejoin.hidden = true; mejoin.disabled = true;

    socket.on('room_status', (data)=>{
        room_manifest["status"] = data;
        M.toast({html: 'update'});

        broadcast(room_manifest["status"].peers)
    })
}

var stream_status = {}

class PeerOutManager{

    constructor(yaar){
        M.toast({html:`${yaar.name} joined`})
        this.conn = peer.connect(yaar.pid);
        this.stream_live = false;
        const thismol = this;
        this.conn.on('open', function(){
            thismol.touch = Date.now()
            
            thismol.aliveInt = setInterval(()=>{
                console.log(thismol.conn)
                console.log("sending 87");M.toast({html: `87`})
                thismol.conn.send(JSON.stringify({type:"alive", data:null}));

                console.log(getUserMedia, thismol.stream_live)
                if((!thismol.stream_live)&&(getUserMedia!=null)){
                    thismol.stream_live = true
                    //peer.call(yaar.pid, mecamera.captureStream());
                    peer.call(yaar.pid, main_stream);
                }
            }, 6000)

            M.toast({html: `${yaar.name} is paired`})
        });
        this.conn.on('data', function(res) {
            res = JSON.parse(res)
            if(res.type == "alive"){
                this.touch = Date.now()
                M.toast({html: `${res.data}`, displayLength:8000});
            }
            else if(res.type == "message"){
                M.toast({html: `${res.message}`, displayLength:8000});
            }
        })
    }

    kill(){
        clearInterval(this.aliveInt)
    }
}

peer.on('connection', function(conn) {
    console.log("some one paired")
    console.log(conn)
    var stream_live = false;
    M.toast({html: `"some one paired"`});
    conn.on('data', function(res){
        M.toast({html: `117`})
        res = JSON.parse(res)
        if(res.type == "alive"){
            this.touch = Date.now()
            M.toast({html: `${res.data}${this.touch}`, displayLength:8000});
            conn.send(JSON.stringify({type:"alive", data:null}))
        }
        console.log(getUserMedia, stream_live, conn.peer)
        if((getUserMedia != null)&&(!stream_live)){
            stream_live = true
            try{
                //peer.call(conn.peer, mecamera.captureStream());
                peer.call(conn.peer, main_stream);
            }catch(e){
                console.log(`137:${e}`)
            }
            
        }
    });
});
var vocal = []
peer.on('call', function(call) {
    console.log("now streaming"+call.peer)
    console.log(call.on)
    M.toast({html:"now streaming"+call.peer})
    
    try{call.answer();
        call.on('stream', function(remoteStream) {
            console.log(141+"streamup")
                if(document.getElementById(call.peer) == null){                
                    var vm = document.createElement("video");
                    vm.setAttribute("id", call.peer)
                    vm.setAttribute("width", "100px")
                    vm.setAttribute("height", "auto")
                    me.appendChild(vm)
                    console.log(160)
                    console.log(remoteStream); vocal.push(remoteStream)
                    document.getElementById(call.peer).srcObject = remoteStream
                    document.getElementById(call.peer).play()
                }
        });
    }catch(e){
        console.log(`167:${e}`)
        alert(e)
    }

})

function broadcast(peers){
    
    for(i in peers){
        //console.log(stream_status[peers[i].pid])
        if(stream_status[peers[i].pid]==undefined){
            if(peers[i].pid == peerid){
                continue
            }
            //console.log(peers[i].pid, peerid, peers[i].pid < peerid)

            if(peers[i].pid < peerid){
                stream_status[peers[i].pid] = new PeerOutManager(peers[i])
            }

        }
    }
    
    if(getUserMedia != null){

    }
}
