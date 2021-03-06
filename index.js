const
  dotenv = require('dotenv').load({silent: true}),
  express = require('express'),
  app = express(),
  ejs = require('ejs'),
  ejsLayouts = require('express-ejs-layouts'),
  mongoose = require('mongoose'),
  flash = require('connect-flash'),
  mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/ChatrBox',
  PORT = process.env.PORT || 3000,
  morgan = require('morgan'),
  bodyParser = require ('body-parser'),
  Chat = require('./models/Chat.js'),
  cors = require('cors'),
  chatRoutes = require('./routes/chats.js'),
  httpServer = require('http').Server(app),
  io = require('socket.io')(httpServer),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  MongoDBStore = require('connect-mongodb-session')(session),
  passport = require('passport'),
  passportConfig = require('./config/passport.js'),
  userRoutes = require('./routes/users.js'),
  User = require('./models/User.js'),
  request = require('request')

//mongodb
mongoose.connect(mongoUrl, (err) => {
  console.log(err || "Connected to MongoDB. WHOOP!")
})

app.use(flash())

//store session
const store = new MongoDBStore({
  uri: mongoUrl,
  collection: 'sessions'
})

//public folder declaration
app.use(express.static(__dirname + '/public'))

//session + passport
app.use(session({
  secret: 'bananas',
  cookie: {maxAge: 60000000},
  resave: true,
  saveUninitialized: false,
  store: store
}))



app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
	app.locals.currentUser = req.user // currentUser now available in ALL views
	app.locals.loggedIn = !!req.user // a boolean loggedIn now available in ALL views

	next()
})

app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated()
  next()
})


//Use middleware
app.use(cors())
app.use(morgan('dev'))
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

//socket.io
io.on('connection', function(socket){
  var query = Chat.find({})
  query.sort('-created').limit(8).exec(function(err, docs) {
    if (err) throw err;
    console.log('sending old chats')
    socket.emit('load old chats', docs);
  })
  console.log("new client connected...")
  socket.on('chat message', function(msg){
    //save to database
    console.log(msg)
    var newMessage = new Chat(msg)
    newMessage.save((err, savedMessage) => {
      console.log('saving message')
      io.emit('chat message', msg)
    })
  })
})



//server
httpServer.listen(PORT, function(err) {
  console.log(err || `Server running on port ${PORT}`)
})

//view engine
app.set('view engine', 'ejs')
app.use(ejsLayouts)


//route
// app.get('/',(req,res) => {
//   res.render('index')
// })

app.get('/users', (req, res) => {
  User.find({}, (err, user) => {
    if (err) return console.log(err)
    res.json(user)
  })
})

//require user Routes
app.use('/', userRoutes)

app.post('/users', (req, res) => {
  User.create(req.body, (err, user) => {
    if (err) return console.log(err)
    res.json(user)
  })
})

//giphy route
app.get('/search/:searchTerm', (req, res) => {
  var searchTerm = req.params.searchTerm
  var apiUrl = 'https://api.giphy.com/v1/gifs/random'
  var apiKey = process.env.GIPHY_API_KEY
  var requestUrl = `${apiUrl}?api_key=${apiKey}&tag=${searchTerm}`//backticks!!!!

  request.get(requestUrl, function(err, response, body) {
    console.log(body)
    res.json(JSON.parse(body))//turn json into javascript object
  })
})

// //User routes
// app.route('/api/users')
//   .get((req, res) => {
//     User.find({}, (err, users) => {
//       res.json(users)
//     })
//   })
//   .post((req, res) => {
//     User.create(req.body, (err, user) => {
//       res.json({success: true, message: "User Created", user})
//     })
//   })
//
// //Updating user
// app.route('api/users/:id')
//   .get((req, res) => {
//     User.findById(req.params.id, (err, user) => {
//       res.json(user)
//     })
//   })
//   .patch((req, res) => {
//     User.findById(req.params.id, (err, user) => {
//       Object.assign(user, req.body)
//       user.save((err, updatedUser) => {
//         res.json({success: true, message: "User updated.", user: updatedUser})
//       })
//     })
//   })
//
// //all routes will be /api/chats/:id
// app.use('/api/chats', chatRoutes)
