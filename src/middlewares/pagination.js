export const pagination = (req, res, next) => {
  const pageAsNumber = Number(req.query.page);
  const sizeAsNumber = Number(req.query.size);

  let page = 0;
  if (!Number.isNaN(pageAsNumber) && pageAsNumber > 0) {
    page = pageAsNumber;
  }

  let size = 10;
  if (!Number.isNaN(sizeAsNumber) && sizeAsNumber > 0 && sizeAsNumber < 10) {
    size = sizeAsNumber;
  }

  const nextPage = page + 1;

  let prevPage = page - 1;

  if (prevPage < 0) {
    prevPage = null;
  }

  req.pagination = {
    page,
    size,
    nextPage,
    prevPage,
  };

  next();
};
