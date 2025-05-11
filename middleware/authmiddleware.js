export const checkAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect("/login");
};

export const checkAdminAuthenticated = (req, res, next) => {
  // If already authenticated as RT admin, redirect to RT admin dashboard
  if (req.session.Admin && req.session.Admin.role === "admin") {
    return res.redirect("/nodotadminpanel");
  }
  return next();
};
