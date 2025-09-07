const express = require('express');
const { authRequired } = require('./middleware');
const controllers = require('./controllers');

const authRouter = express.Router();
authRouter.post('/signup', controllers.signup);
authRouter.post('/login', controllers.login);

const itemsRouter = express.Router();
itemsRouter.get('/', controllers.listItems);
itemsRouter.get('/:id', controllers.getItem);
itemsRouter.post('/', controllers.createItem);
itemsRouter.put('/:id', controllers.updateItem);
itemsRouter.delete('/:id', controllers.deleteItem);

const cartRouter = express.Router();
cartRouter.get('/', authRequired, controllers.getCart);
cartRouter.post('/add', authRequired, controllers.addToCart);
cartRouter.post('/remove', authRequired, controllers.removeFromCart);
cartRouter.put('/', authRequired, controllers.replaceCart);

module.exports = {
  authRouter,
  itemsRouter,
  cartRouter,
};


