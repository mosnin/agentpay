import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

export const ProductContext = createContext(null);
export function useMarket() {
  return useContext(ProductContext);
}
export function navigate(path) {
  location.hash = path;
}
export function useRoute() {
  const read = () =>
    new URL(location.hash.slice(1) || "/", "https://product.invalid/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const change = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
export function Link({ href, children, ...props }) {
  return (
    <a href={href.startsWith("/") ? "#" + href : href} {...props}>
      {children}
    </a>
  );
}
export function NetworkStatus() {
  const market = useMarket(),
    problem = market.error || (!market.panel && market.actionError);
  return (
    <>
      {problem && (
        <p className="network-message" role="alert">
          {problem}
        </p>
      )}
      {market.notice && (
        <p className="network-message" role="status">
          {market.notice}
        </p>
      )}
    </>
  );
}
export function Pager() {
  const { data, setPage, page } = useMarket();
  if (!(page > 1 || data?.more)) return null;
  return (
    <nav className="market-pager" aria-label="Results pages">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span>Page {page}</span>
      <button disabled={!data?.more} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
export function TransactionDialog() {
  const { panel, panelTitle, actionError, busy, close } = useMarket(),
    ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (panel && !dialog.open) dialog.showModal();
    if (!panel && dialog.open) dialog.close();
  }, [panel]);
  return (
    <dialog
      ref={ref}
      className="transaction-dialog"
      aria-label={panelTitle}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2>{panelTitle}</h2>
        <button
          type="button"
          disabled={busy}
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={19} />
        </button>
      </header>
      {actionError && <p role="alert">{actionError}</p>}
      {panel}
    </dialog>
  );
}
