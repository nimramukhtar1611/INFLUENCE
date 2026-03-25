// utils/apiFeatures.js - COMPLETE FIXED VERSION

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.queryOptions = {};
  }

  // ==================== FILTERING ====================
  
  /**
   * Filter results based on query string
   * Excludes special fields and applies operators (gte, gt, lte, lt)
   * @returns {APIFeatures}
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'populate', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering with operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * Search in specified fields
   * @param {Array} fields - Fields to search in
   * @returns {APIFeatures}
   */
  search(fields = []) {
    if (this.queryString.search && fields.length > 0) {
      const searchRegex = new RegExp(this.queryString.search, 'i');
      const searchConditions = fields.map(field => ({ [field]: searchRegex }));
      
      this.query = this.query.find({ $or: searchConditions });
    }
    return this;
  }

  // ==================== SORTING ====================

  /**
   * Sort results
   * Format: ?sort=field1,-field2 (negative for descending)
   * @returns {APIFeatures}
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      this.queryOptions.sort = sortBy;
    } else {
      // Default sort by createdAt descending
      this.query = this.query.sort('-createdAt');
      this.queryOptions.sort = '-createdAt';
    }
    return this;
  }

  /**
   * Sort with pagination support (optimized)
   * @returns {APIFeatures}
   */
  sortWithPagination() {
    if (this.queryString.sort) {
      const sortFields = this.queryString.sort.split(',');
      const sortBy = sortFields.join(' ');
      this.query = this.query.sort(sortBy);
      this.queryOptions.sort = sortBy;
    }
    return this;
  }

  // ==================== FIELD LIMITING ====================

  /**
   * Select specific fields
   * Format: ?fields=field1,field2
   * @returns {APIFeatures}
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
      this.queryOptions.fields = fields;
    } else {
      // Exclude __v by default
      this.query = this.query.select('-__v');
      this.queryOptions.fields = '-__v';
    }
    return this;
  }

  /**
   * Include/exclude specific fields
   * @param {string} fields - Fields to select (space separated)
   * @returns {APIFeatures}
   */
  select(fields) {
    this.query = this.query.select(fields);
    this.queryOptions.fields = fields;
    return this;
  }

  // ==================== PAGINATION ====================

  /**
   * Paginate results
   * Format: ?page=1&limit=10
   * @returns {APIFeatures}
   */
  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.queryOptions.pagination = { page, limit, skip };
    
    return this;
  }

  /**
   * Paginate with cursor-based pagination (for real-time data)
   * Format: ?cursor=timestamp&limit=10
   * @param {string} cursorField - Field to use as cursor (default: '_id')
   * @returns {APIFeatures}
   */
  paginateCursor(cursorField = '_id') {
    const limit = parseInt(this.queryString.limit) || 10;
    const cursor = this.queryString.cursor;

    if (cursor) {
      if (cursorField === '_id') {
        this.query = this.query.where('_id').gt(cursor);
      } else {
        this.query = this.query.where(cursorField).gt(new Date(cursor));
      }
    }

    this.query = this.query.limit(limit);
    this.queryOptions.pagination = { cursor, limit, type: 'cursor' };
    
    return this;
  }

  /**
   * Get pagination metadata
   * @param {number} total - Total documents count
   * @returns {Object}
   */
  getPaginationInfo(total) {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    };
  }

  /**
   * Get cursor pagination metadata
   * @param {Array} results - Current page results
   * @param {string} cursorField - Cursor field name
   * @returns {Object}
   */
  getCursorPaginationInfo(results, cursorField = '_id') {
    const limit = parseInt(this.queryString.limit) || 10;
    const hasMore = results.length === limit;
    
    let nextCursor = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      nextCursor = cursorField === '_id' 
        ? lastItem._id 
        : lastItem[cursorField];
    }

    return {
      limit,
      hasMore,
      nextCursor,
      count: results.length
    };
  }

  // ==================== POPULATION ====================

  /**
   * Populate referenced fields
   * Format: ?populate=field1,field2 or ?populate=field1:select1,select2
   * @returns {APIFeatures}
   */
  populate() {
    if (this.queryString.populate) {
      const populations = this.queryString.populate.split(',');
      
      populations.forEach(pop => {
        if (pop.includes(':')) {
          const [path, select] = pop.split(':');
          this.query = this.query.populate(path, select.split(','));
        } else {
          this.query = this.query.populate(pop);
        }
      });
    }
    return this;
  }

  /**
   * Add specific population
   * @param {string|Object} populate - Population options
   * @returns {APIFeatures}
   */
  addPopulation(populate) {
    if (populate) {
      this.query = this.query.populate(populate);
    }
    return this;
  }

  // ==================== COUNTING ====================

  /**
   * Count total documents (for pagination)
   * @returns {Promise<number>}
   */
  async countTotal() {
    // Clone query for counting
    const countQuery = this.query.model.find(this.query._conditions);
    
    // Apply any necessary filters (but not pagination)
    if (this.query._options?.sort) {
      // Sort doesn't affect count
    }
    
    return await countQuery.countDocuments();
  }

  /**
   * Count with current filters
   * @returns {Promise<number>}
   */
  async count() {
    return await this.query.model.countDocuments(this.query._conditions);
  }

  // ==================== AGGREGATION ====================

  /**
   * Convert to aggregation pipeline (for complex queries)
   * @returns {Array} Aggregation pipeline
   */
  toAggregation() {
    const pipeline = [];
    
    // Match stage
    if (Object.keys(this.query._conditions).length > 0) {
      pipeline.push({ $match: this.query._conditions });
    }

    // Lookup stages from populate
    if (this.query._populate) {
      const populates = Array.isArray(this.query._populate) 
        ? this.query._populate 
        : [this.query._populate];
      
      populates.forEach(pop => {
        pipeline.push({
          $lookup: {
            from: pop.path,
            localField: pop.path,
            foreignField: '_id',
            as: pop.path
          }
        });
        
        if (pop.select) {
          pipeline.push({
            $addFields: {
              [pop.path]: { $arrayElemAt: [`$${pop.path}`, 0] }
            }
          });
        }
      });
    }

    // Sort stage
    if (this.queryOptions.sort) {
      const sortObj = {};
      this.queryOptions.sort.split(' ').forEach(field => {
        if (field.startsWith('-')) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
      pipeline.push({ $sort: sortObj });
    }

    // Skip stage
    if (this.queryOptions.pagination?.skip) {
      pipeline.push({ $skip: this.queryOptions.pagination.skip });
    }

    // Limit stage
    if (this.queryOptions.pagination?.limit) {
      pipeline.push({ $limit: this.queryOptions.pagination.limit });
    }

    // Project stage
    if (this.queryOptions.fields) {
      const projectObj = { _id: 1 };
      this.queryOptions.fields.split(' ').forEach(field => {
        if (!field.startsWith('-')) {
          projectObj[field] = 1;
        }
      });
      pipeline.push({ $project: projectObj });
    }

    return pipeline;
  }

  // ==================== UTILITIES ====================

  /**
   * Get query options
   * @returns {Object}
   */
  getOptions() {
    return this.queryOptions;
  }

  /**
   * Clone the current query
   * @returns {APIFeatures}
   */
  clone() {
    const clone = new APIFeatures(this.query.clone(), { ...this.queryString });
    clone.queryOptions = { ...this.queryOptions };
    return clone;
  }

  /**
   * Execute query and get results with pagination
   * @returns {Promise<Object>}
   */
  async execute() {
    const results = await this.query;
    const total = await this.countTotal();
    
    return {
      data: results,
      pagination: this.getPaginationInfo(total),
      filters: {
        ...this.queryString
      }
    };
  }

  /**
   * Execute query and get results with cursor pagination
   * @param {string} cursorField - Cursor field name
   * @returns {Promise<Object>}
   */
  async executeCursor(cursorField = '_id') {
    const results = await this.query;
    
    return {
      data: results,
      pagination: this.getCursorPaginationInfo(results, cursorField),
      filters: {
        ...this.queryString
      }
    };
  }
}

// ==================== EXPORTS ====================
module.exports = APIFeatures;