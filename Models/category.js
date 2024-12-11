const mongoose = require('mongoose');

// Define the category schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String, // URL for the category image
    required: true,
  }
});

// Create a model from the category schema
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
