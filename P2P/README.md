# P2P
Group video Calling

# To get started

Install npm modules:
```
npm install
```

Web RTC requires SSL and also workable with diffrent internet network gateways
So My recommendation is : https://ngrok.com/

Server is this program will listen to PORT 8080

So Tunnel port 8080 of with NGROK
```
ngrok http 8080
```

To Update the port number or configure it manually check line 147 & line 148 of <server.js>

To Start the server
```
npm start
```

# Live DEMO

[Link to working demo](https://jovialp2p.azurewebsites.net/)

I have hosted my project on azure sites so in that case keep your server's port to `process.env.PORT`
