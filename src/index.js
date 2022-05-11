const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app)  //configure our own server for socket.io so we can pass it into the next line of code
const io = socketio(server) //new instance

//client side of library needs to be implemented in index.html as script, and then script needs to be loaded in.
//For that to happen though /socket.io/socket.io.js needs to run in script in index.html as well

const port = process.env.PORT || 3000

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public')

//Setup static directory to serve
app.use(express.static(publicDirectoryPath))



// server (emit) --> client (receive) - countUpdated
// client (emit) --> server (receive) - increment

io.on('connection', (socket) => {
    console.log('new Websocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room) // join a specific room  emit to everybody in a specific room 

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`)) //emit to all except the one that sent the message in a specific room
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })



    // let count = 0
    // socket.emit('countUpdated', count)  //emitting (to a single connection)

    // socket.on('increment', () => {      //listening
    //     count++
    //     io.emit('countUpdated', count) // emits to all connections
    // })
})


server.listen(port, () => {
    console.log(`Server is listening on port ${port}...`)
})