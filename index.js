const fs = require('fs')
var express = require('express')
var app = express()
//处理token的插件；需要下载
const jwt = require('jsonwebtoken')
//处理跨域的中间件，需要下载
const cors = require('cors')
//处理post请求的中间件
const bodyParser = require('body-parser')
const cartListJSON = require('./db/cartList.json')

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

//分页函数
function pagination (pageSize, currentPage, arr) {
  let skipNum = (currentPage - 1) * pageSize;
  let newArr = (skipNum + pageSize >= arr.length) ? arr.slice(skipNum, arr.length) : arr.slice(skipNum, skipNum + pageSize);
  return newArr;
}

//排序函数
function sortBy (attr, rev) {
  if (rev === undefined) {
    rev = 1;
  } else {
    rev = rev ? 1 : -1;
  }
  return function (a, b) {
    a = a[attr];
    b = b[attr];
    if (a < b) {
      return rev * -1;
    }
    if (a > b) {
      return rev * 1;
    }
    return 0;
  }
}
function range (arr, gt, lte) {
  return arr.filter(item => item.salePrice >= gt && item.salePrice <= lte)
}




//首页接口
app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  fs.readFile('./db/home.json', 'utf8', (err, data) => {
    if (!err) {
      // res.json(JSON.parse(data))
      res.send(data)
    } else {
      console.log(err.message)
    }
  })
})
//全部商品页面接口
app.get('/goods', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  //前端地址栏上的查询参数
  const page = parseInt(req.query.page)
  const size = parseInt(req.query.size)
  const sort = parseInt(req.query.sort)
  const gt = parseInt(req.query.priceGt)
  const lte = parseInt(req.query.priceLte)
  const cid = req.query.cid
  let newData = []
  fs.readFile('./db/allGoods.json', 'utf8', (err, data) => {
    let { result } = JSON.parse(data)
    let allData = result.data
    //分页操作
    newData = pagination(size, page, allData)
    if (cid === '1184') { //品牌周边
      newData = allData.filter((item) => item.productName.match(RegExp(/Smartisan/)))
      if (sort === 1) { //价格由低到高
        newData = newData.sort(sortBy('salePrice', true))
      } else if (sort === -1) { //价格由高到低
        newData = newData.sort(sortBy('salePrice', false))
      }
    } else {
      if (sort === 1) { //价格由低到高
        newData = newData.sort(sortBy('salePrice', true))
      } else if (sort === -1) { //价格由高到低
        newData = newData.sort(sortBy('salePrice', false))
      }
      if (gt && lte) {
        // 过滤 10~1000
        newData = range(newData, gt, lte)
      }
      // 32 

    }
    if (newData.length < size) {
      res.json({
        data: newData,
        total: newData.length
      })
    } else {
      res.json({
        data: newData,
        total: allData.length
      })
    }
  })
})
//商品详情页面接口
app.get('/goods/productDet', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const productId = parseInt(req.query.productId);
  fs.readFile('./db/goodsDetail.json', 'utf8', (err, data) => {
    if (!err) {
      let result = JSON.parse(data).result;
      let newData = result.find(item => item.productId === productId)
      res.json(newData)
    }
  })
})
//模拟登陆接口
app.post('/login', (req, res) => {
  //登录成功获取用户名
  let username = req.body.user
  //一系列操作
  res.json({
    //进行加密的方法
    //sign 参数一：加密对象；参数二：加密规则；参数三：对象
    token: jwt.sign({ username: username }, 'abcd', {
      //过期时间
      expiresIn: '3000s'
    }),
    username,
    state: 1,
    code: 200,
    address: null,
    balance: null,
    description: null,
    email: null,
    message: null,
    phone: null,
    points: null,
    sex: null,
    id: 62
  })
})

// 登录持久化验证接口 访问这个接口的时候 一定要访问token（前端页面每切换一次，就访问一下这个接口，问一下我有没有登录/登陆过期）
// 先访问登录接口，得到token，在访问这个，看是否成功
app.post('/validate', function (req, res) {
  let token = req.headers.authorization;

  // 验证token合法性 对token进行解码
  jwt.verify(token, 'abcd', function (err, decode) {
    if (err) {
      res.json({
        msg: '当前用户未登录'
      })
    } else {
      // 证明用户已经登录
      res.json({
        token: jwt.sign({ username: decode.username }, 'abcd', {
          // 过期时间
          expiresIn: "3000s"
        }),
        username: decode.username,
        msg: '已登录',
        address: null,
        balance: null,
        description: null,
        email: null,
        id: 62,
        message: null,
        phone: null,
        points: null,
        sex: null,
        state: 1,
      })
    }
  })
})

//添加购物车的请求接口
app.post('/addCart', (req, res) => {
  let { userId, productId, productNum } = req.body;
  fs.readFile('./db/allGoods.json', (err, data) => {
    let { result } = JSON.parse(data);
    if (productId && userId) {
      let { cartList } = cartListJSON.result.find(item => item.id == userId)
      // 找到对应的商品
      let newData = result.data.find(item => item.productId == productId);
      newData.limitNum = 100;

      let falg = true;
      if (cartList && cartList.length) {
        cartList.forEach(item => {
          if (item.productId == productId) {
            if (item.productNum >= 1) {
              falg = false;
              item.productNum += parseInt(productNum);
            }
          }
        })
      }
      if (!cartList.length || falg) {  //购物车为空
        newData.productNum = parseInt(productNum)
        cartList.push(newData);
      }

      // 序列化

      fs.writeFile('./db/cartList.json', JSON.stringify(cartListJSON), (err) => {
        if (!err) {
          res.json({
            code: 200,
            message: "success",
            result: 1,
            success: true,
            timestamp: 1571296313981,
          })
        }
      })
    }

  })
})

app.post('/cartList', (req, res) => {
  let { userId } = req.body
  fs.readFile('./db/cartList.json', (err, data) => {
    let { result } = JSON.parse(data)
    let newData = result.find(item => item.id === parseInt(userId))
    res.json({
      code: 200,
      cartList: newData,
      success: true,
      message: 'success'
    })
  })
})







app.listen(3000, '127.0.0.1', function () {
  console.log('node is runing')
})
