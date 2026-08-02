
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import doctor from "../assets/doctor.png";
import background from "../assets/background.png";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (email.trim() === "" || password.trim() === "") {
      alert("Please enter your email and password.");
      return;
    }

    navigate("/dashboard");
  };

 return (
  <div
   style={{
  ...styles.container,
  backgroundImage: `linear-gradient(rgba(10,25,47,0.75), rgba(10,25,47,0.75)), url(${background})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
}}
  >

    <div style={styles.leftSide}>

      <img
        src={logo}
        alt="Logo"
        style={styles.logoImage}
      />

      <h1 style={styles.title}>
        AI-Powered Healthcare Platform
      </h1>

      <p style={styles.description}>
        Predict chronic diseases using Artificial Intelligence.
      </p>

      <div style={styles.features}>
        <p>✔ Diabetes Prediction</p>
        <p>✔ Heart Disease Detection</p>
        <p>✔ Stroke Prediction</p>
        <p>✔ Kidney Disease Prediction</p>
      </div>

      <img
        src={doctor}
        alt="Doctor"
        style={styles.doctor}
      />

    </div>

    <div style={styles.rightSide}>

      <div style={styles.card}>

        <h1 style={styles.logo}>❤️ LifeGuard AI</h1>

        <p style={styles.subtitle}>
          AI-powered Lifestyle Disease Risk Prediction
        </p>

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <div style={styles.passwordContainer}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.passwordInput}
          />

          <button
            type="button"
            style={styles.eyeButton}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <div style={styles.options}>
          <label>
            <input type="checkbox" /> Remember me
          </label>

          <span style={styles.link}>
            Forgot password?
          </span>
        </div>

        <button
          style={styles.button}
          onClick={handleLogin}
        >
          Sign In
        </button>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "#1976d2",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            Register
          </Link>
        </p>

      </div>
        </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,#edf6ff,#ffffff)",
  },

  card: {
    width: "420px",
    padding: "40px",
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0,0,0,.12)",
    textAlign: "center",
  },

  logo: {
    color: "#1976d2",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "30px",
    lineHeight: "1.5",
  },

  input: {
    width: "100%",
    padding: "15px",
    marginBottom: "18px",
    borderRadius: "12px",
    border: "1px solid #ddd",
    fontSize: "16px",
    boxSizing: "border-box",
  },

  passwordContainer: {
    display: "flex",
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "15px",
  },

  passwordInput: {
    flex: 1,
    padding: "15px",
    border: "none",
    outline: "none",
    fontSize: "16px",
  },

  eyeButton: {
    border: "none",
    background: "white",
    cursor: "pointer",
    padding: "0 15px",
    fontSize: "18px",
  },

  options: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    fontSize: "14px",
  },

  button: {
    width: "100%",
    padding: "15px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "18px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  footer: {
    marginTop: "25px",
    color: "#555",
  },

  link: {
    color: "#1976d2",
    cursor: "pointer",
    fontWeight: "bold",
  },
  leftSide: {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "80px",
  color: "white",
},

rightSide: {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
},

logoImage: {
  width: "170px",
  marginBottom: "30px",
},

title: {
  fontSize: "45px",
  fontWeight: "bold",
  marginBottom: "20px",
},

description: {
  fontSize: "20px",
  lineHeight: "1.6",
  marginBottom: "35px",
},

features: {
  fontSize: "22px",
  lineHeight: "2",
},

doctor: {
  width: "450px",
  marginTop: "40px",
},
};