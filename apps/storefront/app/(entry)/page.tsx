import Link from "next/link";
export default function Entry() {
  return (
    <main id="main" className="container section entry">
      <p className="eyebrow">WELCOME TO DAYA</p>
      <h1>A little colour awaits.</h1>
      <p>Choose a language. भाषा चुनें। ભાષા પસંદ કરો.</p>
      <Link className="button" href="/en/">
        Enter the collection →
      </Link>
      <p className="entry-languages">
        <a href="/hi/" lang="hi">
          हिन्दी →
        </a>{" "}
        <a href="/gu/" lang="gu">
          ગુજરાતી →
        </a>
      </p>
    </main>
  );
}
