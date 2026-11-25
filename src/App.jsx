import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "./style.css";

const CATS = ["Technology", "Education", "Lifestyle", "News"];

const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(
      "ContentHub could not save data to localStorage. Browser storage may be full.",
      error
    );
  }
};

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function seed() {
  if (!read("users", []).length) {
    write("users", [
      {
        id: "a1",
        name: "Admin",
        email: "admin@cms.com",
        password: "admin123",
        role: "admin",
      },
    ]);
  }

  if (!read("posts", []).length) {
    write("posts", [
      {
        id: uid(),
        title: "Welcome to the CMS",
        category: "News",
        content:
          "This is the first published article. Admins manage content, users read and contribute.",
        author: "Admin",
        authorId: "a1",
        status: "published",
        date: new Date().toLocaleDateString(),
        comments: [],
        image: "",
      },
      {
        id: uid(),
        title: "Why Flexbox and Grid matter",
        category: "Technology",
        content:
          "CSS Grid handles two-dimensional layouts while Flexbox excels at one-dimensional alignment.",
        author: "Admin",
        authorId: "a1",
        status: "published",
        date: new Date().toLocaleDateString(),
        comments: [],
        image: "",
      },
    ]);
  }
}

seed();

/* ===================== REACT ROUTING ROOT ===================== */
function App() {
  return (
    <BrowserRouter>
      <ContentHubApp />
    </BrowserRouter>
  );
}

/* ===================== STATE MANAGEMENT (useState) ===================== */
function ContentHubApp() {
  const navigate = useNavigate();

  const [users, setUsers] = useState(() => read("users", []));
  const [posts, setPosts] = useState(() => read("posts", []));
  const [session, setSession] = useState(() => read("session", null));
  const [theme, setTheme] = useState(() => read("theme", "dark"));
  const [authMode, setAuthMode] = useState("login");
  const [selectedRole, setSelectedRole] = useState("user");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: CATS[0],
    content: "",
    status: "published",
    image: "",
  });
  const [selectedPost, setSelectedPost] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => write("users", users), [users]);
  useEffect(() => write("posts", posts), [posts]);
  useEffect(() => write("session", session), [session]);

  useEffect(() => {
    write("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const go = (path) => {
    setMessage("");
    navigate(path);
  };

  const logout = () => {
    setSession(null);
    write("session", null);
    setEditing(null);
    resetForm();
    setSelectedPost(null);
    go("/");
  };

  const login = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const roleToLogin = window.location.pathname === "/admin-login" ? "admin" : selectedRole;
    const found = users.find(
      (user) => user.email === email && user.password === password
    );

    if (!found || found.role !== roleToLogin) {
      setMessage(roleToLogin === "admin" ? "Invalid admin credentials" : "Invalid user credentials");
      return;
    }

    const loggedIn = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
    };

    setSession(loggedIn);
    setMessage("");
    navigate(found.role === "admin" ? "/admin/dashboard" : "/user/browse");
  };

  /* ===================== USER SIGNUP FUNCTION ===================== */
  const signup = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");

    if (name.length < 2) {
      setMessage("Enter your name");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }
    if (users.some((user) => user.email === email)) {
      setMessage("Email already registered");
      return;
    }

    setUsers((old) => [
      ...old,
      { id: uid(), name, email, password, role: "user" },
    ]);
    setMessage("Account created. Please sign in.");
    setAuthMode("login");
  };

  function resetForm() {
    setForm({
      title: "",
      category: CATS[0],
      content: "",
      status: "published",
      image: "",
    });
  }

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.width, image.height)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          setMessage("Image processing is not supported in this browser.");
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL("image/jpeg", 0.78);
        setForm((old) => ({ ...old, image: compressed }));
        setMessage("Image added successfully.");
      };

      image.onerror = () =>
        setMessage("Could not process this image. Please try another file.");
      image.src = String(reader.result || "");
    };

    reader.onerror = () =>
      setMessage("Could not read this image. Please try another file.");

    reader.readAsDataURL(file);
    event.target.value = "";
    setMessage("Processing image...");
  };

  /* ===================== CREATE / UPDATE POST FUNCTION ===================== */
  const savePost = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const item = {
      title: String(data.get("title") || "").trim(),
      category: String(data.get("category") || CATS[0]),
      content: String(data.get("content") || "").trim(),
      image: form.image || "",
      status:
        session?.role === "user"
          ? "pending"
          : String(data.get("status") || "published"),
    };

    if (!item.title || !item.content) {
      setMessage("Please enter both title and article content.");
      return;
    }

    if (editing) {
      setPosts((old) =>
        old.map((post) =>
          post.id === editing
            ? {
                ...post,
                ...item,
                status: session?.role === "user" ? "pending" : item.status,
              }
            : post
        )
      );
    } else {
      setPosts((old) => [
        {
          id: uid(),
          ...item,
          author: session?.name || "Unknown",
          authorId: session?.id,
          date: new Date().toLocaleDateString(),
          comments: [],
        },
        ...old,
      ]);
    }

    setEditing(null);
    resetForm();
    setMessage(
      session?.role === "user"
        ? "Article submitted for admin approval."
        : "Post saved successfully."
    );
    navigate(session?.role === "admin" ? "/admin/posts" : "/user/posts");
  };

  /* ===================== EDIT POST FUNCTION ===================== */
  const editPost = (post) => {
    setEditing(post.id);
    setForm({
      title: post.title || "",
      category: post.category || CATS[0],
      content: post.content || "",
      status: post.status || "published",
      image: post.image || "",
    });
    setMessage("");
    navigate(
      session?.role === "admin" ? "/admin/post/edit" : "/user/write"
    );
  };

  /* ===================== DELETE POST FUNCTION ===================== */
  const removePost = (id) => {
    if (window.confirm("Delete this post?")) {
      setPosts((old) => old.filter((post) => post.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
    }
  };

  const changeStatus = (id, status) =>
    setPosts((old) =>
      old.map((post) => (post.id === id ? { ...post, status } : post))
    );

  const removeUser = (id) => {
    if (window.confirm("Remove this user?")) {
      setUsers((old) => old.filter((user) => user.id !== id));
      setPosts((old) => old.filter((post) => post.authorId !== id));
    }
  };

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          post.status === "published" &&
          (!filter || post.category === filter) &&
          (post.title + " " + post.content)
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [posts, filter, search]
  );

  const mine = posts.filter((post) => post.authorId === session?.id);

  const openArticle = (post) => {
    setSelectedPost(post);
    setComment("");
  };

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  const shared = {
    session,
    toggleTheme,
    logout,
    message,
    setMessage,
    posts,
    setPosts,
    users,
    setUsers,
    form,
    setForm,
    editing,
    setEditing,
    resetForm,
    savePost,
    editPost,
    removePost,
    changeStatus,
    removeUser,
    handleImageUpload,
    go,
    search,
    setSearch,
    filter,
    setFilter,
    visiblePosts,
    mine,
    openArticle,
    selectedPost,
    setSelectedPost,
    comment,
    setComment,
  };

  /* ===================== ROUTES: URL TO PAGE MAPPING ===================== */
  return (
    <Routes>
      <Route path="/" element={<HomePage go={go} setAuthMode={setAuthMode} setSelectedRole={setSelectedRole} />} />
      <Route
        path="/login"
        element={
          <AuthPage
            role="user"
            mode="login"
            setAuthMode={setAuthMode}
            login={login}
            signup={signup}
            message={message}
            setMessage={setMessage}
            go={go}
          />
        }
      />
      <Route
        path="/admin-login"
        element={
          <AuthPage
            role="admin"
            mode="login"
            setAuthMode={setAuthMode}
            login={login}
            signup={signup}
            message={message}
            setMessage={setMessage}
            go={go}
          />
        }
      />
      <Route
        path="/signup"
        element={
          <AuthPage
            mode="signup"
            setAuthMode={setAuthMode}
            login={login}
            signup={signup}
            message={message}
            setMessage={setMessage}
            go={go}
          />
        }
      />

      <Route
        path="/user"
        element={
          session?.role === "user" ? (
            <Navigate to="/user/browse" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/user/browse"
        element={
          session?.role === "user" ? (
            <UserLayout {...shared} page="browse" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/user/write"
        element={
          session?.role === "user" ? (
            <UserLayout {...shared} page="write" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/user/posts"
        element={
          session?.role === "user" ? (
            <UserLayout {...shared} page="my" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin"
        element={
          session?.role === "admin" ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          session?.role === "admin" ? (
            <AdminLayout {...shared} page="dash" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/posts"
        element={
          session?.role === "admin" ? (
            <AdminLayout {...shared} page="posts" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/users"
        element={
          session?.role === "admin" ? (
            <AdminLayout {...shared} page="users" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/post/new"
        element={
          session?.role === "admin" ? (
            <AdminLayout {...shared} page="form" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/post/edit"
        element={
          session?.role === "admin" ? (
            <AdminLayout {...shared} page="form" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ---------- Shared UI components: kept in this same App.jsx ---------- */

/* ===================== COMPONENT: MAIN PAGE WITH USER / ADMIN CHOICE ===================== */
function HomePage({ go, setAuthMode, setSelectedRole }) {
  const features = [
    ["🛡️", "Admin Module", "Dashboard, post management, and full user control."],
    ["👤", "User Module", "Browse, search, comment, and submit articles."],
    ["✅", "Approval Workflow", "User posts stay pending until an admin approves."],
    ["🔍", "Search & Filter", "Find content by keyword or category."],
    ["🌓", "Dark Mode", "Switch themes anytime."],
    ["💾", "Local Storage", "Data persists in your browser."],
  ];

  return (
    <>
      <nav className="nav">
        <b>📰 ContentHub</b>
        <div className="row">
          <button
            className="ghost sm"
            onClick={() => {
              setSelectedRole("user");
              setAuthMode("login");
              go("/login");
            }}
          >
            Login
          </button>
          <button
            className="sm"
            onClick={() => {
              setAuthMode("signup");
              go("/signup");
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-blob" />
        <div className="hero-blob" />
        <div className="hero-blob" />
        <div className="hero-content">
          <div className="hero-badge">
            <span /> Role-based Content Management
          </div>
          <h1>
            Create, Manage &amp;
            <br />
            <em>Publish</em> Content
          </h1>
          <p>
            A modern CMS where admins review and publish content, and users
            read, comment, and contribute articles — all without a backend.
          </p>
          {/* MAIN PAGE ROLE SELECTION: choose User or Admin login */}
          <div className="row role-choice">
            <button className="btn" onClick={() => {
              setSelectedRole("user");
              setAuthMode("login");
              go("/login");
            }}>Login as User</button>
            <button className="btn o" onClick={() => {
              setSelectedRole("admin");
              setAuthMode("login");
              go("/admin-login");
            }}>Login as Admin</button>
          </div>
          <div className="row">
            <button className="btn" onClick={() => {
              setSelectedRole("user");
              setAuthMode("signup");
              go("/signup");
            }}>Create User Account</button>
          </div>
          <div className="hero-stats">
            <div>
              <b>2</b>
              <small>User Roles</small>
            </div>
            <div>
              <b>100%</b>
              <small>Client-side</small>
            </div>
            <div>
              <b>0</b>
              <small>Backend Needed</small>
            </div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <span className="eyebrow">✨ Features</span>
          <h2>
            Everything you need to run
            <br />
            a content workflow
          </h2>
          <p className="sub">
            Powerful tools for admins and contributors, built right into the
            browser.
          </p>
        </div>
        <div className="fgrid">
          {features.map(([icon, title, description]) => (
            <div className="card" key={title}>
              <div className="ic">{icon}</div>
              <h4>{title}</h4>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
      <footer>© 2026 ContentHub CMS · Built with React</footer>
    </>
  );
}

/* ===================== COMPONENT: AUTH FORM (PROPS) ===================== */
function AuthPage({ mode, role = "user", login, signup, message, setMessage, go }) {
  const [authMode, setAuthMode] = useState(mode);

  useEffect(() => {
    setAuthMode(mode);
    setMessage("");
  }, [mode, setMessage]);

  const switchMode = (nextMode) => {
    setAuthMode(nextMode);
    setMessage("");
    go(nextMode === "login" ? (role === "admin" ? "/admin-login" : "/login") : "/signup");
  };

  return (
    <div className="auth">
      <div className="brand">
        <div className="brand-logo">📰 ContentHub</div>
        <h1>
          {authMode === "login"
            ? "Welcome back."
            : "Start creating today."}
        </h1>
        <p>
          Your all-in-one content management system. Publish, manage, and
          collaborate effortlessly.
        </p>
        <ul className="brand-features">
          <li>Role-based admin &amp; user modules</li>
          <li>Approval &amp; publishing workflow</li>
          <li>Search, filter &amp; comments</li>
          <li>React-powered interface</li>
        </ul>
      </div>

      <div className="pane">
        <form onSubmit={authMode === "login" ? login : signup}>
          <div className="inner">
            <h2>
              {authMode === "login" ? `Sign in as ${role === "admin" ? "Admin" : "User"} 👋` : "Create account ✨"}
            </h2>
            <p className="hint">
              {authMode === "login"
                ? "Enter your credentials to continue"
                : "Join as a contributor in seconds"}
            </p>
            <div className="msg">{message}</div>

            {authMode === "signup" && (
              <>
                <label>Full name</label>
                <input name="name" required />
                <label>Confirm password</label>
                <input name="confirm" type="password" required />
              </>
            )}

            <label>Email address</label>
            <input name="email" type="email" required />
            <label>Password</label>
            <input name="password" type="password" required />
            <button className="auth-submit">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>

            <p className="auth-switch">
              {authMode === "login" ? "No account?" : "Already registered?"}{" "}
              <a
                href={authMode === "login" ? "/signup" : "/login"}
                onClick={(event) => {
                  event.preventDefault();
                  switchMode(authMode === "login" ? "signup" : "login");
                }}
              >
                {authMode === "login" ? "Create one" : "Sign in"}
              </a>{" "}
              ·{" "}
              <a
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  go("/");
                }}
              >
                Back Home
              </a>
            </p>

            {authMode === "login" && role === "admin" && (
              <div className="demo-box">
                Demo admin: <b>admin@cms.com</b> / <b>admin123</b>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Topbar({ title, role, session, toggleTheme, logout }) {
  return (
    <div className="top">
      <span className="page-title">{title}</span>
      <span className="top-actions">
        <div className="user-chip">
          <div className="avatar">{session?.name?.[0]?.toUpperCase()}</div>
          <span className="role">{role}</span>
          <span>{session?.name}</span>
        </div>
        <button className="alt sm" onClick={toggleTheme}>
          🌓
        </button>
        <button className="alt sm" onClick={logout}>
          Sign out
        </button>
      </span>
    </div>
  );
}

/* ===================== COMPONENT: SIDEBAR NAVIGATION ===================== */
function Sidebar({ items, toggleTheme, logout }) {
  const navigate = useNavigate();
  const location = window.location.pathname;

  return (
    <aside className="side">
      <div className="side-logo">📰 ContentHub</div>
      <nav>
        <div className="side-section">Navigation</div>
        {items.map(([path, label, icon]) => (
          <button
            key={path}
            className={location === path ? "active" : ""}
            onClick={() => navigate(path)}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="side-footer">
        <button className="alt sm" onClick={toggleTheme}>
          🌓 Toggle Theme
        </button>
        <button className="alt sm" onClick={logout}>
          → Sign Out
        </button>
      </div>
    </aside>
  );
}

function MainHeader({ title }) {
  return (
    <div className="main-header">
      <div>
        <h2>{title}</h2>
        <p>ContentHub content management workspace</p>
      </div>
    </div>
  );
}

function Notice({ message }) {
  return message ? <p className="notice">{message}</p> : null;
}

function UserLayout(props) {
  const {
    page,
    session,
    theme,
    toggleTheme,
    logout,
    message,
    posts,
    setPosts,
    form,
    setForm,
    editing,
    setEditing,
    resetForm,
    savePost,
    editPost,
    removePost,
    search,
    setSearch,
    filter,
    setFilter,
    visiblePosts,
    mine,
    openArticle,
    selectedPost,
    setSelectedPost,
    comment,
    setComment,
    setMessage,
    handleImageUpload,
  } = props;

  const userNav = [
    ["/user/browse", "Browse Articles", "📚"],
    ["/user/write", "Write Article", "✍️"],
    ["/user/posts", "My Posts", "📂"],
  ];

  const title =
    page === "browse"
      ? "User Workspace"
      : page === "write"
        ? "User Workspace"
        : "User Workspace";

  return (
    <div className="layout">
      <Topbar
        title={title}
        role="USER"
        session={session}
        toggleTheme={toggleTheme}
        logout={logout}
      />
      <Sidebar
        items={userNav}
        toggleTheme={toggleTheme}
        logout={logout}
      />
      <main className="main">
        <Notice message={message} />

        {page === "browse" && (
          <section className="tab">
            <MainHeader title="📚 Articles" />
            <div className="bar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search articles..."
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="">All categories</option>
                {CATS.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="grid">
              {visiblePosts.map((post) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  openArticle={openArticle}
                />
              ))}
            </div>
            {!visiblePosts.length && <p>No articles found.</p>}
          </section>
        )}

        {page === "write" && (
          <section className="tab">
            <MainHeader title={editing ? "✍️ Edit Article" : "✍️ Write Article"} />
            <ArticleForm
              form={form}
              setForm={setForm}
              savePost={savePost}
              handleImageUpload={handleImageUpload}
              editing={editing}
              cancel={() => {
                setEditing(null);
                resetForm();
                setMessage("");
              }}
              cancelPath="/user/posts"
              submitLabel={editing ? "Save Changes" : "Submit for Review"}
              userMode
            />
          </section>
        )}

        {page === "my" && (
          <section className="tab">
            <MainHeader title="📂 My Posts" />
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((post) => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td>{post.category}</td>
                      <td>
                        <span className={`tag ${post.status}`}>{post.status}</span>
                      </td>
                      <td className="act">
                        <button className="sm alt" onClick={() => editPost(post)}>
                          Edit
                        </button>
                        <button
                          className="sm bad"
                          onClick={() => removePost(post.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {selectedPost && (
        <ArticleModal
          post={selectedPost}
          session={session}
          setPosts={setPosts}
          setSelectedPost={setSelectedPost}
          comment={comment}
          setComment={setComment}
        />
      )}
    </div>
  );
}

function AdminLayout(props) {
  const navigate = useNavigate();
  const {
    page,
    session,
    toggleTheme,
    logout,
    message,
    posts,
    users,
    form,
    setForm,
    editing,
    setEditing,
    resetForm,
    savePost,
    editPost,
    removePost,
    changeStatus,
    removeUser,
    handleImageUpload,
    setMessage,
  } = props;

  const adminNav = [
    ["/admin/dashboard", "Dashboard", "📊"],
    ["/admin/posts", "Manage Posts", "📝"],
    ["/admin/users", "Manage Users", "👥"],
  ];

  return (
    <div className="layout">
      <Topbar
        title="Admin Dashboard"
        role="ADMIN"
        session={session}
        toggleTheme={toggleTheme}
        logout={logout}
      />
      <Sidebar
        items={adminNav}
        toggleTheme={toggleTheme}
        logout={logout}
      />
      <main className="main">
        <Notice message={message} />

        {page === "dash" && (
          <section className="tab">
            <MainHeader title="📊 Dashboard" />
            <div className="stats">
              {[
                ["Total Posts", posts.length],
                ["Published", posts.filter((post) => post.status === "published").length],
                ["Pending Review", posts.filter((post) => post.status === "pending").length],
                ["Users", users.filter((user) => user.role === "user").length],
              ].map(([label, value]) => (
                <div className="card" key={label}>
                  <b>{value}</b>
                  {label}
                </div>
              ))}
            </div>
          </section>
        )}

        {page === "posts" && (
          <section className="tab">
            <MainHeader title="📝 Manage Posts" />
            <button
              className="new-post-button"
              onClick={() => {
                setEditing(null);
                resetForm();
                setMessage("");
                navigate("/admin/post/new");
              }}
            >
              + New Post
            </button>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td>{post.category}</td>
                      <td>{post.author}</td>
                      <td>
                        <span className={`tag ${post.status}`}>{post.status}</span>
                      </td>
                      <td className="act">
                        <button
                          className="sm alt"
                          onClick={() => editPost(post)}
                        >
                          Edit
                        </button>
                        {post.status !== "published" ? (
                          <button
                            className="sm ok"
                            onClick={() => changeStatus(post.id, "published")}
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            className="sm alt"
                            onClick={() => changeStatus(post.id, "draft")}
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          className="sm bad"
                          onClick={() => removePost(post.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page === "form" && (
          <section className="tab">
            <MainHeader title={editing ? "Edit Post" : "New Post"} />
            <ArticleForm
              form={form}
              setForm={setForm}
              savePost={savePost}
              handleImageUpload={handleImageUpload}
              editing={editing}
              cancel={() => {
                setEditing(null);
                resetForm();
                setMessage("");
              }}
              cancelPath="/admin/posts"
              submitLabel="Save Post"
            />
          </section>
        )}

        {page === "users" && (
          <section className="tab">
            <MainHeader title="👥 Manage Users" />
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        {user.role === "admin" ? (
                          "—"
                        ) : (
                          <button
                            className="sm bad"
                            onClick={() => removeUser(user.id)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ===================== COMPONENT: ARTICLE CARD; PROPS RECEIVE POST DATA ===================== */
function ArticleCard({ post, openArticle }) {
  return (
    <div className="card">
      {post.image && (
        <img className="article-card-image" src={post.image} alt={post.title} />
      )}
      <span className="tag">{post.category}</span>
      <h4>{post.title}</h4>
      <small>
        By {post.author} · {post.date}
      </small>
      <p>{post.content.slice(0, 120)}...</p>
      <button className="sm" onClick={() => openArticle(post)}>
        Read
      </button>
    </div>
  );
}

/* ===================== COMPONENT: ARTICLE FORM; PROPS + CONTROLLED STATE ===================== */
function ArticleForm({
  form,
  setForm,
  savePost,
  handleImageUpload,
  editing,
  cancel,
  cancelPath,
  submitLabel,
  userMode = false,
}) {
  const navigate = useNavigate();

  const cancelForm = () => {
    cancel();
    navigate(cancelPath);
  };

  return (
    <form className="card cms-form" onSubmit={savePost}>
      <label>Title</label>
      <input
        name="title"
        required
        value={form.title}
        onChange={(event) =>
          setForm((old) => ({ ...old, title: event.target.value }))
        }
      />

      <label>Category</label>
      <select
        name="category"
        value={form.category}
        onChange={(event) =>
          setForm((old) => ({ ...old, category: event.target.value }))
        }
      >
        {CATS.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>

      <label>Content</label>
      <textarea
        name="content"
        rows={userMode ? "9" : "8"}
        required
        value={form.content}
        onChange={(event) =>
          setForm((old) => ({ ...old, content: event.target.value }))
        }
      />

      <label>Article image (optional, max 2 MB)</label>
      <input type="file" accept="image/*" onChange={handleImageUpload} />

      {form.image && (
        <div className="image-preview-wrap">
          <img className="image-preview" src={form.image} alt="Article preview" />
          <button
            type="button"
            className="sm alt"
            onClick={() => setForm((old) => ({ ...old, image: "" }))}
          >
            Remove image
          </button>
        </div>
      )}

      {!userMode && (
        <>
          <label>Status</label>
          <select
            name="status"
            value={form.status}
            onChange={(event) =>
              setForm((old) => ({ ...old, status: event.target.value }))
            }
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
          </select>
        </>
      )}

      <div className="form-actions">
        <button>{editing ? (userMode ? "Save Changes" : "Update Post") : submitLabel}</button>
        <button type="button" className="alt" onClick={cancelForm}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ArticleModal({
  post,
  session,
  setPosts,
  setSelectedPost,
  comment,
  setComment,
}) {
  const submitComment = (event) => {
    event.preventDefault();
    if (!comment.trim()) return;

    const updated = {
      ...post,
      comments: [
        ...(post.comments || []),
        { by: session.name, text: comment.trim() },
      ],
    };

    setPosts((old) =>
      old.map((item) => (item.id === updated.id ? updated : item))
    );
    setSelectedPost(updated);
    setComment("");
  };

  return (
    <div className="modal-backdrop" onClick={() => setSelectedPost(null)}>
      <div
        className="article-modal card"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="alt sm close-modal"
          onClick={() => setSelectedPost(null)}
        >
          × Close
        </button>
        <h2>{post.title}</h2>
        <small>
          {post.category} · {post.author} · {post.date}
        </small>
        {post.image && (
          <img
            className="article-modal-image"
            src={post.image}
            alt={post.title}
          />
        )}
        <p className="article-full-content">{post.content}</p>
        <h4>Comments ({post.comments?.length || 0})</h4>
        {(post.comments || []).map((item, index) => (
          <p className="comment" key={index}>
            <b>{item.by}</b>: {item.text}
          </p>
        ))}
        <form onSubmit={submitComment}>
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment..."
          />
          <button>Comment</button>
        </form>
      </div>
    </div>
  );
}

export default App;
