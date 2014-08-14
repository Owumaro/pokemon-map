$(function () {
    'use strict';
    console.log(username);
    // Socket start
    var socket = io.connect('http://localhost:8080');

    // Canvas setup
    var ctx = $('canvas#game')[0].getContext('2d');
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight - $('header').outerHeight();
    $(window).resize(function(evt) {
        if (evt.target === window) {
            ctx.canvas.width = window.innerWidth;
            ctx.canvas.height = window.innerHeight - $('header').outerHeight();
            draw(ctx, game);
        }
    });
    // turn off antialiasing
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.oImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    
    // Game setup
    var game = new MapEngine();
    game.loadMap();
    game.playerList.addPlayer({name: username, character: character, x: game.map.start.x*16, y: game.map.start.y*16, orientation: 40, foot: 0});
    game.loadCharactersImages();
    game.checkImagesLoad(function() {
        draw(ctx, game);
    });
    game.zoom = 4;

    // UI
    $('#playerlist .panel-body, #chat .panel-body').perfectScrollbar();

    $('#map-title').append(game.map.name);

    $('#zoom').slider({ min: 1, max: 16, value: game.zoom, handle: 'triangle', formater: function(val) {
        return 'x' + val;
    } }).on('slide', function(obj) {
        game.zoom = obj.value;
        draw(ctx, game);
    });

    // Compute destination
    function dest(code) {
        var player = game.playerList.getMainPlayer();
        switch (code) {
            case 37: return player.x/16-1+player.y/16*game.width; break;
            case 38: return player.x/16+(player.y/16-1)*game.width; break;
            case 39: return player.x/16+1+player.y/16*game.width; break;
            case 40: return player.x/16+(player.y/16+1)*game.width; break;  
        }
    }

    // Repeat func n times with t delay
    var moveRepeat = function(func, i, n, t) {
        setTimeout(function() {
            func();
            // Foot switch
            if (i%8==1) {
                var player = game.playerList.getMainPlayer();
                player.foot++;
                if (player.foot == 4) {
                    player.foot = 0;
                }
            }
            if (i!=n) { moveRepeat(func, i+1, n, t); }
            else {
                game.moving = false;
            }
        }, t);
    }

    var speed = 0;

    // Walk
    function walk(code) {
        var player = game.playerList.getMainPlayer();
        moveRepeat(function() {
            switch (code) {
                case 37: player.x--; break;
                case 38: player.y--; break;
                case 39: player.x++; break;
                case 40: player.y++; break;
            }
            socket.emit('movement', player);
            draw(ctx, game);
        }, 1, 16, speed);
    }

    // Idle
    function idle(code) {
        var player = game.playerList.getMainPlayer();
        moveRepeat(function() {
            socket.emit('movement', player);
            draw(ctx, game);
        }, 1, 16, speed);
    }

    // Keyboard events
    $(document).keydown(function(evt) {
        var message = $("input#message");
        // If arrow
        if (evt.keyCode>=37 && evt.keyCode<=40 && !message.is(":focus")) {
            var player = game.playerList.getMainPlayer();
            // If player isn't moving
            if (!game.moving) {
                // Change orientation
                player.orientation = evt.keyCode;

                if (game.map.walkable[dest(evt.keyCode)]) {
                    // Walk
                    game.moving = true;
                    walk(evt.keyCode);
                }
                else {
                    // Idle
                    game.moving = true;
                    idle(evt.keyCode);
                }
            }
        }
        // If enter
        else if (evt.keyCode==13) {
            if(!message.is(":focus")) {
                message.focus();
            }
            else {
                if (message.val()!='') {
                    socket.emit('chat_msg', message.val());
                    message.val('');
                }
                message.blur();
            }
        }
        // If escape
        else if (evt.keyCode==27) {
            message.blur();
        }
    });

    // Send player to the socket
    socket.emit('join', game.playerList.getMainPlayer());

    // Update playerlist
    updatePlayerlist(game);

    // Socket events
    // Player join
    socket.on('player', function(player) {
        console.log('Received new player: ' + player.name);
        // Add player to the game
        game.playerList.addPlayer(player);
        game.loadCharactersImages();
        game.checkImagesLoad(function() {
            draw(ctx, game);
        });
        // Update dashboard
        updatePlayerlist(game);
    });

    // Player moving
    socket.on('movement', function(player) {
        console.log('Received movement: ' + player.name);
        game.playerList.updatePlayer(player);
        draw(ctx, game);
    });

    // Player leave
    socket.on('leave', function(name) {
        console.log('Received leave: ' + name);
        // Remove player from the game
        game.playerList.removePlayer(name);
        draw(ctx, game);
        // Update dashboard
        updatePlayerlist(game);
    });

    // Chat message
    socket.on('chat_msg', function(msg) {
        console.log('Received chat message');
        // Scroll to bottom
        $('#chat .panel-body > ul').append('<li><span class="label label-default">' + msg.author + '</span> ' + msg.content + '</li>');
        $('#chat .panel-body').scrollTop($('#chat .panel-body > ul').outerHeight() - $('#chat .panel-body').innerHeight());
    });
})

// Draw map & players
function draw(ctx, game) {
    // Cleaning canvas
    if (game.map.backgroundColor !== undefined) {
        ctx.fillStyle = game.map.backgroundColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // Get main player coordinates
    var player = game.playerList.getMainPlayer();
    var x = player.x;
    var y = player.y;
    var zoom = game.zoom;

    // Get offset
    var xoff = Math.floor(ctx.canvas.width/2) - x*zoom - 16*zoom/2;
    var yoff = Math.floor(ctx.canvas.height/2) - y*zoom - 16*zoom/2;

    // Draw map
    ctx.drawImage(game.imgs[game.map.file], xoff, yoff, game.imgs[game.map.file].width*zoom, game.imgs[game.map.file].height*zoom);

    // Draw players
    var players = game.playerList.players;
    for (k in players) {
        // Get the right sprite from set
        var pos;
        switch (players[k].orientation) {
            case 37: pos = 3; break;
            case 38: pos = 6; break;
            case 39: pos = 9; break;
            case 40: pos = 0; break;
        }
        switch (players[k].foot) {
            case 1: pos += 1; break;
            case 3: pos += 2; break;
        }
        // Draw sprite
        ctx.drawImage(game.imgs['img/characters/' + players[k].character + '.gif'], pos*48, 0, 48, 48, (players[k].x-16)*zoom + xoff, (players[k].y-16)*zoom + yoff, 48*zoom, 48*zoom);
    }

    // Player tags
    $('#tags').empty();
    for (i in players) {
        $('#tags').append('<div class="tooltip fade top in"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + players[i].name + '</div></div>');
        $('#tags').children().last()
        .css('margin-left', xoff + players[i].x*zoom + 8*zoom - ($('#tags div').last().outerWidth())/2)
        .css('margin-top', yoff + players[i].y*zoom - 10*zoom - 32);
    }
}

// Update player list
function updatePlayerlist(game) {
    $('#playerlist ul').empty();
    var players = game.playerList.players;
    for (i in players) {
        $('#playerlist ul').append('<li>' + players[i].name + '</li>');
    }
    $('#playerlist .badge').html('').append(players.length);
}