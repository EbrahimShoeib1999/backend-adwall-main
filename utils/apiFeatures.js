class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const queryStringObj = { ...this.queryString };
    const excludesFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
    excludesFields.forEach((field) => delete queryStringObj[field]);

    const queryObj = {};
    Object.keys(queryStringObj).forEach(key => {
      const value = queryStringObj[key];
      if (typeof value === 'string') {
        // Check if the value is a boolean string
        if (value === 'true' || value === 'false') {
          queryObj[key] = value === 'true';
        } else {
          // It's a string, use case-insensitive regex
          queryObj[key] = { $regex: value, $options: 'i' };
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like gte, lte
        const operatorKey = Object.keys(value)[0];
        const operatorValue = value[operatorKey];
        queryObj[key] = { [`$${operatorKey}`]: operatorValue };
      }
      else {
        // For other types like numbers, booleans not as strings
        queryObj[key] = value;
      }
    });

    this.mongooseQuery = this.mongooseQuery.find(queryObj);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }
    return this;
  }

  search(searchFields = []) {
    if (this.queryString.keyword && searchFields.length > 0) {
      const searchQuery = searchFields.map(field => (
        { [field]: { $regex: this.queryString.keyword, $options: 'i' } }
      ));
      this.mongooseQuery = this.mongooseQuery.find({ $or: searchQuery });
    }
    return this;
  }

  paginate(countDocuments) {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 50;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // Pagination result
    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit);

    // next page
    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.prev = page - 1;
    }
    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    this.paginationResult = pagination;
    return this;
  }
}

module.exports = ApiFeatures;
