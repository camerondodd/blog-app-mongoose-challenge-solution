const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {DATABASE_URL} = require('../config');
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }
  return BlogPost.insertMany(seedData);
}

 function generateAuthor() {
   const authors = [
     'Steve Taco', 'Frank Taco', 'Bob Taco', 'Joe Taco'];
   return authors[Math.floor(Math.random() * authors.length)];
 }

function generateContent() {
  const contents = ['Today I met a taco', 'Today the taco ate me','Today I ate a taco'];
  return contents[Math.floor(Math.random() * contents.length)];
}

function generateTitle() {
  const titles = ['Taco love','Taco hate','The tale of two tacos'];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateBlogData() {
  return {
    // author: {
    // 	firstName:faker.name.firstName(),
    // 	lastName:faker.name.lastName()
    // },
    author: generateAuthor(),
    content: generateContent(),
    title: generateTitle(),
  }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blogs API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  })

  describe('GET endpoint', function() {

    it('should return all existing blog posts', function() {
      let blog;
      return chai.request(app)
        .get('/posts')
        .then(function(_blog) {
          blog = _blog;
          blog.should.have.status(200);
          blog.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          blog.body.should.have.length.of(count);
        });
    });


    it('should return blog posts with right fields', function() {

      let blogBlog;
      return chai.request(app)
        .get('/posts')
        .then(function(blog) {
          blog.should.have.status(200);
          blog.should.be.json;
          blog.body.should.be.a('array');
          blog.body.should.have.length.of.at.least(1);

          blog.body.forEach(function(blogpost) {
            blogpost.should.be.a('object');
            blogpost.should.include.keys(
              'id', 'author', 'content', 'title', 'created');
          });
          blogBlog = blog.body[0];
          return BlogPost.findById(blogBlog.id);
        })
        .then(function(blogpost) {
          blogBlog.title.should.equal(blogpost.title);
          blogBlog.content.should.equal(blogpost.content);
          blogBlog.author.should.equal(blogpost.authorName);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new post', function() {

      const newPost = generateBlogData();
      let mostRecentPost;

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(blog) {
          blog.should.have.status(201);
          blog.should.be.json;
          blog.body.should.be.a('object');
          blog.body.should.include.keys(
            'id', 'author', 'content', 'title', 'created');
          blog.body.title.should.equal(newPost.title);
          blog.body.id.should.not.be.null;
          blog.body.content.should.equal(newPost.content);
          // blog.body.author.should.equal(newPost.author);

          return BlogPost.findById(blog.body.id);
        })
        .then(function(blogpost) {
          // blogpost.author.should.equal(newPost.author);
          blogpost.content.should.equal(newPost.content);
          blogpost.title.should.equal(newPost.title);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields you send over', function() {
      const updateData = {
      	title: 'test title',
        author: 'Not Me',
        content: 'stuff'
      };

      return BlogPost
        .findOne()
        .then(function(blogpost) {
          updateData.id = blogpost.id;

          return chai.request(app)
            .put(`/posts/${blogpost.id}`)
            .send(updateData);
        })
        .then(function(blog) {
          blog.should.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(blogpost) {
          // blogpost.author.should.equal(updateData.author);
          blogpost.content.should.equal(updateData.content);
        });
      });
  });

  describe('DELETE endpoint', function() {

    it('delete a post by id', function() {

      let blogpost;

      return BlogPost
        .findOne()
        .then(function(_blogpost) {
          blogpost = _blogpost;
          return chai.request(app).delete(`/posts/${blogpost.id}`);
        })
        .then(function(blog) {
          blog.should.have.status(204);
          return BlogPost.findById(blogpost.id);
        })
        .then(function(_blogpost) {
          should.not.exist(_blogpost);
        });
    });
  });
});