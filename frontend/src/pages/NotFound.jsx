import page404 from "../assets/page404.jpg"
import '../css/NotFound.css'
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="notfound-page">
      <Link to="/">
        <img src={page404}></img>
      </Link>
    </main>
  );
};