import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>❤️</h1>

      <h1 style={styles.title}>LifeGuard AI</h1>

      <p style={styles.subtitle}>
        AI-Powered Lifestyle Disease Risk Prediction
      </p>

      <div style={styles.loader}></div>

      <p style={styles.loading}>Loading...</p>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "linear-gradient(180deg,#162450,#263d91)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
  },

  logo: {
    fontSize: "70px",
    marginBottom: "10px",
  },

  title: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  subtitle: {
    color: "#ddd",
    marginBottom: "50px",
  },

  loader: {
    width: "55px",
    height: "55px",
    border: "5px solid rgba(255,255,255,.3)",
    borderTop: "5px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loading: {
    marginTop: "20px",
    letterSpacing: "5px",
  },
};