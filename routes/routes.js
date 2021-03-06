var express = require('express');
var router = express.Router();
var models = require('../models');
var User = models.User;
var Product = models.Product;
var School = models.School;
var Review = models.Review;
var fs = require('fs')


//////////////////////////////// PUBLIC ROUTES ////////////////////////////////
// Users who are not logged in can see these routes

router.get('/', function(req, res, next) {
  res.render('Notehub');
});

router.get('/login', function(req, res) {
  res.render('login')
})

router.get('/home', function(req, res) {
  res.render('home')
})

router.post('/',function(req,res){
  var course = req.body.subject;
  //find all the notes that pretain to the course from the dropdown bar
  Product.find()
  .populate('owner')
  .populate('school')
  .exec(function(err,docs){
    console.log(docs);
    res.render('Notehub',{ //renders the search page with all the notes
      notes:docs, //docs has all the info of each product
      Searching: true
    })
  })
})

router.get('/profile/:userid', function(req, res) {
  res.render('userprofile')
})

router.get('/newProduct', function(req, res) {
  res.render('newProduct')
})

router.get('/product/:id', function(req, res) {
  var id = req.params.id;
  //   5969f6898b287a674362d488
  console.log(id);
  Product.findById(id)
  .exec(
    function(err,doc){
      console.log(doc);
      res.render('singleproduct',{
        product: doc,
        pkey: process.env.STRIPE_PKEY
      })
      //res.json(doc)
    }
  )
})

router.post('/product/:id',function(req,res){
  var review = req.body.reviewtext;
  var id = req.params.id;

  new Review({
    owner: req.user._id,
    content: review,
    rating: 3
  }).save(function(err, thereview) {
    Product.findById(id)
    .exec(
      function(err,doc){

        var length = doc.reviews.length+1;
        console.log('length: ' + length)
        if(length-1 !== 0 ){
          var summedratings = 0;
          for(var i = 0; i < doc.reviews.length; i++) {
            summedratings += doc.reviews[i].rating
          }
          console.log(summedratings);
          summedratings += thereview.rating;
        }else{
          var summedratings = thereview.rating;
        }
        console.log('summedratings: ' + summedratings)
        var avg = summedratings/length;
        console.log('avg: ' + avg);
        var allreviews=[...doc.reviews,thereview];
        console.log("allreviews: " + allreviews);
        Product.findByIdAndUpdate(id, {
          $set: {
            productrating: avg,
            reviews: allreviews
           }
         }, function(err, theproduct){
           console.log("theproduct: " + theproduct)
           if(err) {
             console.log(err)
           } else {
             res.redirect("/marketplace")
           }
         })
      })
  })
  })



  router.post('/newProduct', function(req, res) {
    var img = req.file.mimetype.split('image/');
    var path = req.file.path.split('public')[1]+'.'+img[1]
    console.log(path)
    var newProduct = new Product({
      name: req.body.name,
      pdf: path,
      owner: req.user._id,
      price: req.body.price,
      course: req.body.course,
      subject: req.body.subject,
      school: req.user.school,
      description: req.body.description
    })
    newProduct.save(function(err) {
      if (err) {
        console.log("product not saved");
      }
      else {
        console.log('Product saved!');
        fs.rename(req.file.path, req.file.path+'.'+img[1], function(err) {
          if (err) {
            console.log('Failed to update path to correct file type.');
          }
        })
        Product.findOne({name: req.body.name, description: req.body.description}, function(err, product) {
          if (err) {
            console.log('error in finding saved product');
          }
          else {
            res.redirect('/product/'+product._id)
          }
        })
      }
    })
  })




  ///////////////////////////// END OF PUBLIC ROUTES /////////////////////////////

  router.use(function(req, res, next){
    if (!req.user) {
      res.redirect('/');
    } else {
      return next();
    }
  });


  //////////////////////////////// PRIVATE ROUTES ////////////////////////////////
  // Only logged in users can see these routes

  router.get('/marketplace', function(req, res) {
    console.log(req.user.school)
    console.log(req.user.major)
    Product.find({school: req.user.school,subject: req.user.major})
    .populate('school')
    .populate('owner')
    .exec(
      function(err,doc){
        console.log(doc);
        res.render('marketplace', {
          product:doc,
          user: req.user
        })
      })
    });
    router.post('/marketplace', function(req,res){
      var school = req.body.school_select;
      if(school === 'Northwestern U'){
        school='59695fa2d1770b298c31c3bb'
      }else if(school === 'Hong Kong U'){
        school='59695fa2d1770b298c31c3bc'
      }else if(school === 'UC Berkeley'){
        school='59695fa2d1770b298c31c3ba'
      }else if(school === 'UC San Diego'){
        school='59695fa2d1770b298c31c3b9'
      }else{
        school='all'
      }
      var find ={};
      find['subject']=req.body.major_select;
      if('all'!==school){
        find.school=school;
      }
      var sort = {}
      if(req.body.price_select = 'Rating'){
        Product.find(find)
        .populate('school')
        .populate('owner')
        .sort(sort)
        .exec(
          function(err,doc){
            doc=doc.sort(function(a,b){
              a.owner.sellerrating-b.owner.sellerrating
            })
            res.render('marketplace',{
              product:doc,
              user: req.user
            })
          }
        )
      }else if(req.body.price_select = 'Low to high'){
        sort = {
          price: -1
        }
        Product.find(find)
        .populate('school')
        .populate('owner')
        .sort(sort)
        .exec(
          function(err,doc){
            res.render('marketplace',{
              product:doc,
              user: req.user
            })
          }
        )
      }else{
        sort = {
          price: 1
        }
        Product.find(find)
        .populate('school')
        .populate('owner')
        .sort(sort)
        .exec(
          function(err,doc){
            res.render('marketplace',{
              product:doc,
              user: req.user
            })
          }
        )
      }
    })


    ///////////////////////////// END OF PRIVATE ROUTES /////////////////////////////

    module.exports = router;
