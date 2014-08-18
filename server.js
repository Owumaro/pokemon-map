// Node modules
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// Playerlist data structure
var PlayerList = require('./playerlist.js').PlayerList;
var playerlist = new PlayerList();

// Express settings
app.use(express.cookieParser());
app.use(express.session({secret: 'awesomesalt'}));
app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);
app.use(express.static(__dirname));

// Express start
server.listen(8080, function() {
    console.log('Listening on 8080');
});

// Express router
app.get('/server.js', function(req, res) {
    res.send('Nice try.');
});

app.get('/', function(req, res){
    res.render('index.ejs');
});

app.get('/game.html', function(req, res){
    if (req.session.username !== undefined)
        res.render('game.ejs', {username: req.session.username, character: req.session.character});
    else
        res.redirect('/');
});

app.get('/logout', function(req, res) {
    var username = req.session.username;
    console.log('Log out: '+username+', destroying session');
    req.session.destroy();
    res.redirect('/');
});

app.post('/join', function(req, res) {
    // read request
    var username = req.body.username;
    var character = req.body.character;

    if (playerlist.getPlayer(username) !== undefined) {
        res.send('not available');
    } else {
        req.session.username = username;
        req.session.character = character;
        res.send('ok');
    }
});

// Socket.io settings
io.enable('browser client minification');
io.enable('browser client etag');
io.enable('browser client gzip');
io.set('log level', 1);

// Socket.io events
io.sockets.on('connection', function (socket) {
    console.log('Socket connect');

    // New player
    socket.on('join', function(player) {
        console.log(player.name + ' joined the game');
        // Save player
        socket.set('username', player.name);
        // Add new player to the list of players
        playerlist.addPlayer(player);
        // Send other players to the new player
        for (i in playerlist.players) {
            if (playerlist.players[i].name != player.name) {
                socket.emit('player', playerlist.players[i]);
            }
        }
        // Broadcast information
        socket.broadcast.emit('player', player);
    });

    // Movement
    socket.on('movement', function(player) {
        // Update player in register
        playerlist.updatePlayer(player);
        // Broadcast new coords to others
        socket.broadcast.emit('movement', player);
    });

    // Chat
    socket.on('chat_msg', function(msg) {
        // Replace < > characters
        msg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        socket.get('username', function(error, name) {
            // Send to author
            socket.emit('chat_msg', {author: name, content: msg});
            // Broadcast to others
            socket.broadcast.emit('chat_msg', {author: name, content: msg});
        });
    });

    // Disconnect
    socket.on('disconnect', function() {
        socket.get('username', function(error, name) {
            console.log('Socket disconnect');
            // If played had joined the game
            if (name !== null) {
                console.log(name + ' has left the game');
                // Remove from register
                playerlist.removePlayer(name);
                // Broadcast information
                socket.broadcast.emit('leave', name);
            }
        });
    });
});
