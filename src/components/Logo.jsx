import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";
import brand from "../../brand.json";

/** Logo de la marque (fichiers dans src/assets ; nom dans brand.json). inverse = version pour fond foncé. */
export default function Logo({ className = "", inverse = false, height = 32 }) {
  return <img src={inverse ? logoWhite : logo} alt={brand.name} style={{ height, width: "auto", maxWidth: "none" }} className={`self-start shrink-0 select-none ${className}`} draggable={false} />;
}
