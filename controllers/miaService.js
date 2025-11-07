const factory = require('./handlersFactory');
const Mia = require('../model/miaModel');

// @desc    Get list of mias
// @route   GET /api/v1/mias
// @access  Public
exports.getMias = factory.getAll(Mia);

// @desc    Get specific mia by id
// @route   GET /api/v1/mias/:id
// @access  Public
exports.getMia = factory.getOne(Mia);

// @desc    Create mia
// @route   POST  /api/v1/mias
// @access  Private/Admin-Manager
exports.createMia = factory.createOne(Mia);

// @desc    Update specific mia
// @route   PUT /api/v1/mias/:id
// @access  Private/Admin-Manager
exports.updateMia = factory.updateOne(Mia);

// @desc    Delete specific mia
// @route   DELETE /api/v1/mias/:id
// @access  Private/Admin
exports.deleteMia = factory.deleteOne(Mia);
