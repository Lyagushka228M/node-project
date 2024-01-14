const { json } = require('body-parser')
const express = require('express')
const fileUpload = require('express-fileupload')
const session = require('express-session')
const fs = require('fs')
const app = express()
const path = require('path')

let secret = 'ebalrotetogoexpressa'

app.set('view engine','ejs')
app.use(express.urlencoded({extended: false}))
app.use(express.static('public'))
app.use(express.json())
app.use(fileUpload())
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}))



const usersDataPath = path.join(__dirname, 'users.json')
const cardsDataPath = path.join(__dirname, 'cards.json')
const cardsData = JSON.parse(fs.readFileSync(cardsDataPath, 'utf-8'))


app.get('/', (req, res) =>{
    res.render('index')
})
app.get('/about', (req, res) =>{
    res.render('about')
})
app.get('/reg', (req, res)=>{
    res.render('register')
})
app.get('/log', (req, res)=>{
    res.render('login')
})
app.get('/adminpage', (req, res)=>{
    res.render('adminpage')
})
app.get('/allreadyregister', (req, res)=>{
    res.render('allreadyregister')
})
app.get('/404', (req, res)=>{
    res.render('404')
})
app.get('/addreq', (req, res)=>{
    res.render('usersCards')
})
app.get('/src', (req, res)=>{
    res.render('search')
})
app.get('/shop',(req, res)=>{
    fs.readFile(cardsDataPath, 'utf-8',(err,data)=>{
        if(err){
            console.error('Failed to read file cards.json', err)
            res.status(500).send('Failed to read file cards.json')
            return
        }
        const cards = JSON.parse(data)
        res.render('shop', {cards: cards})
    })
})
app.get('/product/:productArt', function(req, res){
    fs.readFile(cardsDataPath, 'utf-8',(err,data)=>{
        if(err){
            console.error('Failed to read file cards.json', err)
            res.status(500).send('Failed to read file cards.json')
            return
        }
        const productArt = req.params.productArt
        const cardsData = JSON.parse(fs.readFileSync(cardsDataPath, 'utf-8'))
        const card = cardsData.find(card => card.item_Id === productArt)
        if(card){
            res.render('product', {card: card})
        }  else{
            res.status(404).redirect('/404')
        }
    })
})
app.get('/cart', (req, res) => {
    const users = JSON.parse(fs.readFileSync(usersDataPath, 'utf-8'))
    const userId = req.session.userId
    if (!userId) {
    //   res.send('User not logged in')
      res.redirect('/log')
      return;
    }
    const user = users.users.find(u => u.id === userId)
    if (!user) {
      res.status(404).send('User not found')
      return
    }
    const selectedCards = user.cart.map(item => {
        const product = cardsData.find(c => c.item_Id === item.item_Id)
        return {
            ...product,
            quantity: item.quantity,
            total: product.price * item.quantity
        }
    })
    res.render('cart', { cartItems: selectedCards })
  });
  
  


//------postы--------
app.post('/register', (req, res) =>{
    const generateRandomId = () => {
        return Math.floor(1000000000 + Math.random() * 9000000000)
      }      
    const newUser = req.body
    let users = JSON.parse(fs.readFileSync(usersDataPath))
    const userExists = users.users.some(user => user.username === newUser.username)
    if (userExists) {
        res.redirect('/404')
    } else {
        const randomId = generateRandomId()
        newUser.id = randomId
        newUser.cart = []
        newUser.usersCard = []
        users.users.push(newUser)
        fs.writeFileSync(usersDataPath, JSON.stringify(users))
        res.redirect('/');
    }
})
app.post('/login', (req, res) => {
    const { username, password } = req.body
    let users = JSON.parse(fs.readFileSync(usersDataPath))
    const user = users.users.find(u => u.username === username && u.password === password)
    if (user) {
        req.session.userId = user.id
        res.redirect('/')
    }else if(username === 'adm1n' && password ==='password'){  //безопасность наше всё
        res.redirect('/adminpage')
    }
    else {
        res.status(401).send('Invalid username or password.')
    }
})
app.post('/addcard', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.')
    }
    let productImage = req.files.productImage;
    let fileName = productImage.name;
    productImage.mv('public/images/' + fileName, (err) => {
        if (err) {
            console.error("fail tp send image to server", err)
            res.status(500).send("fail to send image to server")
            return;
        }
        let imagePath = 'images/' + fileName
        let newProduct = {
            name: req.body.productName,
            item_Id: req.body.productArt,
            description: req.body.productDescription,    
            price: req.body.productPrice,
            image: imagePath,
            type: req.body.productType
        }
        fs.readFile(cardsDataPath, 'utf-8', (err, data) => {
            if (err) {
                console.error('fail to read file cards.json', err)
                res.status(500).send('fail to read file cards.json')
                return
            }
            let cards = [];
            try {
                cards = JSON.parse(data);
            } catch (error) {
                console.error('fail to parse file cards.json', error)
                res.status(500).send('fail to parse file cards.json')
                return
            }
            cards.push(newProduct);
            fs.writeFile(cardsDataPath, JSON.stringify(cards), (err) => {
                if (err) {
                    console.error('fail to write to file cards.json', err)
                    res.status(500).send('failed to write to file cards.json')
                    return
                }
                res.status(200).send('product card was added to file cards.json')
            })
        })
    })
})
app.post('/delcard',(req, res)=>{
    const { productArt } = req.body
    if (!productArt) {
        return res.status(400).send('Product Art is required.')
    }
    fs.readFile(cardsDataPath, 'utf-8', (err, data) => {
        if (err) {
            console.error('Failed to read cards.json:', err)
            return res.status(500).send('Failed to read cards.json')
        }
        let cards = JSON.parse(data)
        const updatedCards = cards.filter(product => product.item_Id !== productArt)
        fs.writeFile(cardsDataPath, JSON.stringify(updatedCards), (err) => {
            if (err) {
                console.error('Failed to write to cards.json:', err)
                return res.status(500).send('Failed to write to cards.json')
            }
            res.status(200).send('Product deleted successfully')
        })
    })
})
app.post('/addtocart', (req, res)=>{
    const { itemId, quantity } = req.body
    const userId = req.session.userId
    const editedQuantity = parseInt(quantity)
    if(userId){
        let users = JSON.parse(fs.readFileSync(usersDataPath))
        const user = users.users.find(u => u.id === userId)
        if(user){
            const existItem = user.cart.find(item => item.item_Id === itemId)
            if(existItem){
                existItem.quantity += editedQuantity
            } else{
                user.cart.push({ item_Id: itemId, quantity: editedQuantity })
            }
            fs.writeFileSync(usersDataPath, JSON.stringify(users))
            res.status(200).send('Item added to cart')
        } else {
            res.status(404).redirect('/404')
        }
    }else{
        res.status(400).send('user not loggined')
        res.redirect('/log')
    }
})
app.post('/deletefromcart', (req, res) => {
    const userId = req.session.userId
    if (!userId) {
      return res.status(401).send('User not logged in')
    }
    let users = JSON.parse(fs.readFileSync(usersDataPath, 'utf-8'))
    const user = users.users.find(u => u.id === userId)
    if (user) {
      let selectedItems = req.body.selectedItems
      if (!Array.isArray(selectedItems)) {
        selectedItems = [selectedItems]
      }

      user.cart = user.cart.filter(item => !selectedItems.includes(item.item_Id))
      fs.writeFileSync(usersDataPath, JSON.stringify(users, null, 2))
      res.redirect('/cart')
    } else {
      res.redirect('/404')
    }
  })
  app.post('/search', (req, res) => {
    const search = req.body.search.toLowerCase()
    const searchedProduct = cardsData.find(card => card.name === search)
    const itemID = searchedProduct.item_Id
    if(searchedProduct){
        res.redirect(`/product/${itemID}`)
    } else{
        res.redirect('404')
    }
  })
  app.post('/addrequisites',(req, res)=>{
    const userId = req.session.userId
    let newCard = {
        newCard: req.body.newCard,
        newValidityDate: req.body.NewValidityDate,
        newCvv: req.body.NewCvv
    }
    if(userId){
        let users = JSON.parse(fs.readFileSync(usersDataPath))
        const user = users.users.find(u => u.id === userId)
        if(user){
            user.usersCard.push(newCard)
            fs.writeFileSync(usersDataPath, JSON.stringify(users))
            const selectedCards = user.cart.map(item => cardsData.find(card => card.item_Id === item.item_Id))
            res.send('card added sucsesfully!')
            console.log(`user(id:${userId}), with cart:`)
            console.log(selectedCards)
        } else{
            res.redirect('/404')
        }
    }
})
app.post('/sort',(req, res)=>{
    const sortOption = req.body.sortOption
    fs.readFile(cardsDataPath, 'utf-8',(err,data)=>{
        if(err){
            console.error('Failed to read file cards.json', err)
            res.status(500).send('Failed to read file cards.json')
            return
        }
        let cards = JSON.parse(data)
        if(sortOption === 'pic'){
            cards = cards.filter(item => item.type === 'pic')
            res.render('shop', {cards: cards})
        } else if(sortOption === 'www'){
            cards = cards.filter(item => item.type === 'www')
            res.render('shop', {cards: cards}) 
        } else if(sortOption === 'price-up'){
            cards.sort((down, up) => down.price - up.price)
            res.render('shop', {cards: cards})
        } else if(sortOption === 'price-down'){
            cards.sort((down, up) => up.price - down.price)
            res.render('shop', {cards: cards})
        } else{
            res.redirect('/shop')
        } 
    })
})
  
  
  


const port = 3000
app.listen(port,()=>{
    console.log(`http://localhost:${port}`)
}) 