// utils/formatCategoryId.js
const formatCategoryId = (company) => {
  if (company.categoryId && company.categoryId._id) {
    const { _id, ...rest } = company.categoryId;
    company.categoryId = { id: _id.toString(), ...rest };
  }
  return company;
};

const formatCompanies = (companies) => {
  return companies.map(formatCategoryId);
};

module.exports = { formatCategoryId, formatCompanies };