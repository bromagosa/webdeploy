/*
   Dead Simple Web Deployer
   Copyright (C) 2016 Bernat Romagosa

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License along
   with this program; if not, write to the Free Software Foundation, Inc.,
   51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

var http = require('http'),
    bodyParser = require('body-parser'),
    express = require('express'),
    crypto = require('crypto'),
    app = express(),
    httpServer = http.Server(app),
    io = require('socket.io')(httpServer),
    fs = require('fs'),
    proc = require('child_process'),
    currentUser,
    validUser = JSON.parse(fs.readFileSync('user.json'));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('static'));

app.get('/', function(getRequest, getResponse) {
    if (currentUser) {
        getResponse.render('index.ejs', { user: currentUser })
    } else {
        getResponse.render('login.ejs')
    }
});

['snap4arduino', 'whitecat'].forEach(function(entryPoint) {
    app.get('/' + entryPoint, function(getRequest, getResponse) {
        if (currentUser) {
            getResponse.render('deploy.ejs', { user: currentUser });
            io.on('connection', function(socket) { 
                var process = proc.spawn(
                        '/opt/' + entryPoint + '/update-build-all.sh',
                        [], 
                        { cwd: '/opt/' + entryPoint });
                process.stdout.on('data', function(data) { socket.emit('data', '' + data) });
            });
        } else {
            getResponse.render('login.ejs')
        }
    });
})

app.get('/logout', function(getRequest, getResponse) {
    currentUser = null;
    getResponse.redirect('/');
});

app.post('/login', function(postRequest, postResponse) {
    if (postRequest.body.username == validUser.username &&
        crypto.createHash('md5').update(postRequest.body.password).digest('hex') == validUser.password) {
        currentUser = { username: validUser.username };
        postResponse.redirect('/');
    } else {
        postResponse.render('loginfailed.ejs');
    }
})

httpServer.listen(9999);
