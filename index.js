$(function () {
    'use strict';

    /* Character selection */
    
    var character = 'frlg_boy';

    $('#nav a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })

    // Init character previews
    $.ajaxSetup({ async: false });

    $.get('/json/characters.json', function(data) {
        for (var i in data.characters) {
            for (var j in data.characters[i]) {
                $('.character-list:eq(' + i + ')')
                .append('<li style="background-image:url(\'img/characters/' + data.characters[i][j] + '.gif\')" class="character-thumb"></li>');
            }
        }
    });

    function refreshIcon() {
        $('.character-thumb').each(function() {
            if ($(this).css('background-image').match('img/characters/' + character + '.gif') !== null) {
                $(this).append('<span class="glyphicon glyphicon-ok"></span>');
            }
            else {
                $(this).empty();
            }
        });
    }
    refreshIcon();

    // Character click event
    $('.character-list li').click(function(event) {
        character = $(event.target).css('background-image').match(/(\w+).gif/)[1];
        refreshIcon();
    });

    // Character mouseover animation interval
    var interval_id;

    // Character mouseover event
    $('.character-list li').mouseover(function(event) {
        var elt = $(event.target);
        interval_id = window.setInterval(function() {
            switch (elt.css('background-position-x')) {
                case '0%':
                    elt.css('background-position-x', '528px');
                    break;
                case '528px':
                    elt.css('background-position-x', '0px');
                    break;
                case '0px':
                    elt.css('background-position-x', '480px');
                    break;
                case '480px':
                    elt.css('background-position-x', '0%');
                    break;
            }
        }, 150);
    });

    // Character mouseout event
    $('.character-list li').mouseout(function(event) {
        window.clearInterval(interval_id);
        $(event.target).css('background-position-x', '0%');
    });


    /* Submit */

    $('form').submit(function() {
        event.preventDefault();

        var usernameInput = $('input#username');
        var username = usernameInput.val();
        // Remove errors
        usernameInput.parent().removeClass('has-error');
        usernameInput.siblings().remove();
        // Check lengths
        if (username.length == 0) {
            usernameInput.focus().parent()
            .addClass('has-error')
            .append('<label class="control-label" for="username">Please enter your username.</label>');
        }
        else {
            // Join the game !
            $.ajax({
                type: 'POST',
                url: '/join',
                data: { username: username, character: character }
            })
            .done(function(msg) {
                console.log(msg);
                switch (msg) {
                    case 'not available':
                        usernameInput.focus().parent()
                        .addClass('has-error')
                        .append('<label class="control-label" for="username">This username is not available.</label>');
                        break;
                    case 'ok':
                        window.location.href = 'game.html';
                        break;
                }
            });
        }
    });
})