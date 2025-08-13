const userService = require("../services/userService");
const { getInitials } = require("../utils/helpers");

const showUsersPage = async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    res.render("pages/users", {
      title: "User Management",
      user: {
        name: req.session.userInfo.name || req.session.userInfo.username,
        initials: getInitials(
          req.session.userInfo.name || req.session.userInfo.username
        ),
        username: req.session.userInfo.username,
        loginMethod: req.session.userInfo.loginMethod,
        isAdmin: res.locals.user?.isAdmin || false,
      },
      currentWorkingSite: res.locals.currentWebsite,
      authorID: authorID,
    });
  } catch (error) {
    console.error("Error loading user management page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load user management page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await userService.createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {
    console.log("UPDATE USER CONTROLLER DEBUG:");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("User session:", req.session.userInfo);
    
    const { id } = req.params;
    const userData = req.body;
    const success = await userService.updateUser(id, userData);

    console.log("Service returned success:", success);

    if (success) {
      res.json({ message: "User updated successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error updating user in controller:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to update user", details: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await userService.deleteUser(id);

    if (success) {
      res.json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

module.exports = {
  showUsersPage,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
