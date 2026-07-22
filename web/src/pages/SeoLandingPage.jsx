import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { PropertyGrid } from '../components/PropertyGrid.jsx';
import { PropertyEmptyState } from '../components/PropertyEmptyState.jsx';
import { SiteFooter } from '../components/SiteFooter.jsx';

/** SeoLandingPage — 9.7: the real, navigable React version of the region/city/category pages
 * the server also renders for crawlers (server/seo/landingData.js is the single source of
 * truth for the copy/data shape; this just fetches the same thing over /api/seo/landing so a
 * real visitor gets the exact content Googlebot saw, not a different client-only render). */
export function SeoLandingPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Three route shapes feed into this one component:
  //  /אזור/:regionSlug  /עיר/:citySlug  /קטגוריה/:categorySlug  /:seg1/:seg2 (combo)
  const query = params.regionSlug
    ? { region: params.regionSlug }
    : params.citySlug
    ? { city: params.citySlug }
    : params.categorySlug
    ? { category: params.categorySlug }
    : { region: params.seg1, category: params.seg2 };

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    propertyApi.seoLanding(query)
      .then((d) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.regionSlug, params.citySlug, params.categorySlug, params.seg1, params.seg2]);

  // The authoritative noindex signal is the server-rendered <head> (server/app.js) — this is a
  // best-effort mirror for the client-rendered navigation case (visitor clicked a link, no full
  // page load happened), setting the tag directly in <head> rather than in the component tree,
  // since a <meta> rendered inside <body> isn't reliably honored.
  useEffect(() => {
    if (!data) return;
    let tag = document.head.querySelector('meta[name="robots"][data-seo-lp]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'robots');
      tag.setAttribute('data-seo-lp', 'true');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', data.indexable ? 'index, follow' : 'noindex, follow');
    document.title = data.title;
    return () => { tag?.remove(); };
  }, [data]);

  if (loading) return <div className="pp__loading-page container" dir="rtl"><p className="bsp__loading">טוען…</p></div>;

  if (notFound || !data) {
    // Combo route couldn't resolve seg1 as a region or city — this is genuinely a 404, not
    // one of our pages. A future /:seg1/:seg2 could just as easily be someone else's route.
    return (
      <div className="container" dir="rtl" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p>העמוד לא נמצא.</p>
        <Link to="/">לדף הבית</Link>
      </div>
    );
  }

  return (
    <div className="seo-lp" dir="rtl">
      <nav className="property-breadcrumbs container" aria-label="פירורי לחם">
        {data.breadcrumbs.map((b, i) => (
          <span key={b.name} style={{ display: 'contents' }}>
            {i > 0 && <ChevronLeft size={13} aria-hidden="true" />}
            {b.path && i < data.breadcrumbs.length - 1 ? <Link to={b.path}>{b.name}</Link> : <span aria-current={i === data.breadcrumbs.length - 1 ? 'page' : undefined}>{b.name}</span>}
          </span>
        ))}
      </nav>

      <div className="container seo-lp__header">
        <h1 className="seo-lp__title">{data.h1}</h1>
        <p className="seo-lp__intro">{data.intro}</p>
      </div>

      <div className="container">
        {data.properties.length === 0 ? (
          <PropertyEmptyState hasActiveFilters={false} filters={{}} />
        ) : (
          <PropertyGrid properties={data.properties} isLoading={false} />
        )}
      </div>

      {data.relatedLinks.length > 0 && (
        <div className="container seo-lp__related">
          <h2 className="seo-lp__section-title">חיפושים קרובים</h2>
          <div className="seo-lp__related-links">
            {data.relatedLinks.slice(0, 12).map((l) => (
              <Link key={l.path} to={l.path} className="seo-lp__related-link">{l.label}</Link>
            ))}
          </div>
        </div>
      )}

      <div className="container seo-lp__faq">
        <h2 className="seo-lp__section-title">שאלות נפוצות</h2>
        {data.faq.map((f) => (
          <div key={f.q} className="seo-lp__faq-item">
            <h3 className="seo-lp__faq-q">{f.q}</h3>
            <p className="seo-lp__faq-a">{f.a}</p>
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
