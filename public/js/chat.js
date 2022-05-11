const socket = io() // io() connects to the server using websockets

// Elements (to manipulate buttons, forms, text fields on web page (HTML DOM))
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')


//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }) //Querystring added to the url (location.search command in console), questionmark ignored/removed

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild //grab the new message

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage) //provided by browser
    const newMessageMargin = parseInt(newMessageStyles.marginBottom) //get margin value
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin //add to the height of the message to get the total height 

    //Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
    
    console.log(newMessageMargin)
}


socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') //maybe don't use momentjs for new projects anymore. Use Luxon or Temporal
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    
    $messageFormButton.setAttribute('disabled', 'disabled') //disable button
    
    const message = e.target.elements.message.value

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled') //enable button
        $messageFormInput.value = '' //emptying message field
        $messageFormInput.focus() //put cursor at beginning of text field

        if(error) {
            return console.log(error)

        }

        console.log('Message delivered!')
    })
})

//using mdn - geolocation

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your brwoser')
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})



// socket.on('countUpdated', (count) => {  //listening
//     console.log('The count has been updated', count)
// })

// document.querySelector('#increment').addEventListener('click', () => {
//     console.log('Clicked')
//     socket.emit('increment')   //emitting
// })