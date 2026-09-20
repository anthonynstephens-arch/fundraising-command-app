"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import { DMD_LOGO, DMD_LOGIN } from "@/lib/branding/dmd";
import { useDialogAccessibility } from "@/components/public/useDialogAccessibility";
import type { StoreProduct, StoreImage } from "@/lib/public/storefront";
import {
  type Campaign,
  type CartItem,
  useCampaignCart,
  CartDrawer,
  findVariant,
  campaignIsOpen,
  money,
  emitStoreEvent,
} from "./BaseStorefront";

const root = (campaign: Campaign) => `/fundraisers/${campaign.slug}`;
const productUrl = (campaign: Campaign, product: StoreProduct) =>
  `${root(campaign)}/products/${product.handle}`;
const categories = [
  "Shop all",
  "Tees",
  "Sweatshirts",
  "Hoodies",
  "Headwear",
  "Accessories",
];
function category(product: StoreProduct) {
  const name = product.title.toLowerCase();
  if (/hood/.test(name)) return "Hoodies";
  if (/sweatshirt|crewneck|crew neck|pullover/.test(name)) return "Sweatshirts";
  if (/beanie|cap\b|hat\b/.test(name)) return "Headwear";
  if (/tee|t-shirt|shirt|tank/.test(name)) return "Tees";
  return "Accessories";
}
function MerchandiseImage({
  image,
  title,
  secondary = false,
  eager = false,
}: {
  image?: StoreImage;
  title: string;
  secondary?: boolean;
  eager?: boolean;
}) {
  if (!image) return <span className="dmd-no-image">{title}</span>;
  // Shopify CDN supports responsive resizing without proxying catalog media.
  const sized = (width: number) => {
    const url = new URL(image.url, "https://www.fundraisercommand.com");
    if (url.hostname.endsWith("shopify.com"))
      url.searchParams.set("width", String(width));
    return url.toString();
  };
  return (
    <img
      className={secondary ? "dmd-secondary-image" : undefined}
      src={sized(1000)}
      srcSet={[360, 640, 1000, 1600]
        .map((width) => `${sized(width)} ${width}w`)
        .join(",")}
      sizes="(max-width: 700px) 90vw, 50vw"
      width={image.width || 1000}
      height={image.height || 1000}
      alt={secondary ? "" : image.altText || title}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
function ProductCard({
  campaign,
  product,
  onQuick,
}: {
  campaign: Campaign;
  product: StoreProduct;
  onQuick: (product: StoreProduct) => void;
}) {
  return (
    <article className="dmd-product-card">
      <div className="dmd-product-media">
        <Link
          href={productUrl(campaign, product)}
          aria-label={`View ${product.title}`}
        >
          <MerchandiseImage image={product.images[0]} title={product.title} />
          {product.images[1] && (
            <MerchandiseImage
              image={product.images[1]}
              title={product.title}
              secondary
            />
          )}
        </Link>
        <button
          className="dmd-quick-button"
          onClick={() => {
            emitStoreEvent("product_view", {
              campaignId: campaign.id,
              productId: product.id,
            });
            onQuick(product);
          }}
          aria-label={`Quick view ${product.title}`}
        >
          Quick view <span aria-hidden="true">＋</span>
        </button>
        {!product.available && <span className="dmd-sold-out">Sold out</span>}
      </div>
      <div className="dmd-product-caption">
        <Link href={productUrl(campaign, product)}>{product.title}</Link>
        <span>
          {product.minPrice !== product.maxPrice ? "From " : ""}
          {money(product.minPrice)}
        </span>
      </div>
    </article>
  );
}
function Purchase({
  campaign,
  product,
  onAdd,
  quick = false,
}: {
  campaign: Campaign;
  product: StoreProduct;
  onAdd: (item: CartItem) => void;
  quick?: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.options
        .filter((option) => option.values.length === 1)
        .map((option) => [option.name, option.values[0]]),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(-1);
  const [zoom, setZoom] = useState(false);
  const [message, setMessage] = useState("");
  const touchStart = useRef<number | null>(null);
  const variant = findVariant(product, selected);
  const active =
    imageIndex < 0
      ? variant?.image || product.images[0]
      : product.images[imageIndex];
  function advance(step: number) {
    setImageIndex(
      (current) =>
        ((current < 0 ? 0 : current) + step + product.images.length) %
        product.images.length,
    );
    setZoom(false);
  }
  const available = (name: string, value: string) =>
    product.variants.some(
      (v) =>
        v.available &&
        v.selectedOptions.some((o) => o.name === name && o.value === value),
    );
  function add() {
    const missing = product.options.find((o) => !selected[o.name]);
    if (missing) {
      setMessage(`Select ${missing.name.toLowerCase()} to continue.`);
      return;
    }
    if (!variant?.available || !campaignIsOpen(campaign)) {
      setMessage("This selection is currently unavailable.");
      return;
    }
    onAdd({
      productId: product.id,
      variantId: variant.id,
      productTitle: product.title,
      variantTitle: variant.title,
      image: active?.url || null,
      quantity,
      price: variant.price,
      campaignId: campaign.id,
      organizationId: campaign.organization_id,
    });
    emitStoreEvent("add_to_cart", {
      campaignId: campaign.id,
      productId: product.id,
      variantId: variant.id,
      quantity,
      value: variant.price * quantity,
    });
  }
  return (
    <div className={"dmd-purchase" + (quick ? " dmd-purchase-quick" : "")}>
      <section className="dmd-gallery" aria-label="Product gallery">
        <button
          className={"dmd-gallery-main" + (zoom ? " is-zoomed" : "")}
          aria-label={zoom ? "Zoom out" : "Zoom product image"}
          aria-pressed={zoom}
          onClick={() => setZoom(!zoom)}
          onTouchStart={(e) => {
            touchStart.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStart.current !== null && product.images.length > 1) {
              const delta = touchStart.current - e.changedTouches[0].clientX;
              if (Math.abs(delta) > 50) {
                advance(delta > 0 ? 1 : -1);
                e.preventDefault();
              }
            }
            touchStart.current = null;
          }}
        >
          <MerchandiseImage image={active} title={product.title} eager />
        </button>
        <div className="dmd-gallery-caption">
          <span>
            {product.images.length
              ? `${
                  Math.max(
                    0,
                    product.images.findIndex((i) => i.url === active?.url),
                  ) + 1
                } / ${product.images.length}`
              : ""}
          </span>
          <span>Tap image to {zoom ? "reduce" : "enlarge"}</span>
          {product.images.length > 1 && (
            <div>
              <button onClick={() => advance(-1)} aria-label="Previous image">
                ←
              </button>
              <button onClick={() => advance(1)} aria-label="Next image">
                →
              </button>
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="dmd-thumbnails">
            {product.images.map((im, i) => (
              <button
                key={im.url}
                aria-label={`View image ${i + 1}`}
                aria-pressed={active?.url === im.url}
                onClick={() => {
                  setImageIndex(i);
                  setZoom(false);
                }}
              >
                <MerchandiseImage image={im} title={product.title} />
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="dmd-purchase-info">
        <p className="dmd-label">
          THE DMD COLLECTION / {category(product).toUpperCase()}
        </p>
        <h1>{product.title}</h1>
        <p className="dmd-price">
          {variant
            ? money(variant.price)
            : product.minPrice === product.maxPrice
              ? money(product.minPrice)
              : `${money(product.minPrice)} – ${money(product.maxPrice)}`}
        </p>
        <div className="dmd-options">
          {product.options.map((option) => (
            <fieldset key={option.name}>
              <legend>
                {option.name}
                {selected[option.name] && (
                  <span> / {selected[option.name]}</span>
                )}
              </legend>
              <div>
                {option.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected[option.name] === value}
                    disabled={!available(option.name, value)}
                    onClick={() => {
                      setSelected((current) => ({
                        ...current,
                        [option.name]: value,
                      }));
                      setImageIndex(-1);
                      setMessage("");
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <label className="dmd-quantity">
          Quantity{" "}
          <select
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <p className="dmd-purchase-message" role="status">
          {message}
        </p>
        <div className="dmd-purchase-action">
          <button
            className="dmd-button"
            onClick={add}
            disabled={!campaignIsOpen(campaign) || !product.available}
          >
            {!campaignIsOpen(campaign)
              ? "Store currently closed"
              : !product.available
                ? "Sold out"
                : "Add to bag"}
            <span>
              {money((variant?.price ?? product.minPrice) * quantity)} ＋
            </span>
          </button>
        </div>
        {quick ? (
          <Link className="dmd-text-link" href={productUrl(campaign, product)}>
            View full details <span>↗</span>
          </Link>
        ) : (
          <div className="dmd-product-details">
            {product.description && (
              <section>
                <h2>About this piece</h2>
                <p>{product.description}</p>
              </section>
            )}
            <section>
              <h2>Sizing & garment information</h2>
              <p>
                Select from the available garment options above. Need help
                finding your fit?{" "}
                <a href="mailto:support@fundraisercommand.com">
                  Contact our fulfillment team
                </a>{" "}
                before ordering.
              </p>
            </section>
            <section>
              <h2>Shipping & fulfillment</h2>
              <p>
                Printed and fulfilled by Detroit Decal & Apparel. Shipping
                options, taxes, and the final total are shown at Shopify
                checkout.
              </p>
              <a href={`${root(campaign)}#store-information`}>
                Store information →
              </a>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
function Footer({
  campaign,
  onInfo,
}: {
  campaign: Campaign;
  onInfo: (name: string) => void;
}) {
  return (
    <footer className="dmd-footer">
      <div className="dmd-footer-top">
        <span className="dmd-label">DETROIT, MICHIGAN</span>
        <a className="dmd-text-link" href="https://detroitmetdance.org/">
          Explore DMD ↗
        </a>
      </div>
      <p className="dmd-footer-statement">
        Always
        <br />
        <em>moving forward.</em>
      </p>
      <div className="dmd-footer-bottom">
        <Link href={root(campaign)}>
          <img
            src="/brand/dmd/wordmark-cream.svg"
            alt="Detroit Metropolitan Dance"
            width="240"
            height="100"
          />
        </Link>
        <nav aria-label="Footer">
          <Link href={`${root(campaign)}#collection`}>Shop</Link>
          <a href="https://detroitmetdance.org/company">About DMD</a>
          <a href="mailto:support@fundraisercommand.com">Contact</a>
          <Link href={DMD_LOGIN}>Member access</Link>
        </nav>
        <nav id="store-information" aria-label="Store information">
          {["Shipping", "Returns", "Privacy", "Terms"].map((item) => (
            <button key={item} onClick={() => onInfo(item)}>
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div className="dmd-colophon">
        <span>Official DMD merchandise</span>
        <span>Fulfilled by Detroit Decal & Apparel · Checkout by Shopify</span>
      </div>
    </footer>
  );
}
const information: Record<string, { title: string; copy: string }> = {
  Shipping: {
    title: "Shipping & fulfillment",
    copy: "Detroit Decal & Apparel prints and fulfills DMD merchandise. Available shipping services, charges, taxes, and delivery estimates are shown at Shopify checkout before payment. For an order update, contact support@fundraisercommand.com with your order number.",
  },
  Returns: {
    title: "Returns & order assistance",
    copy: "For return eligibility, size questions, damaged items, or an issue with your order, contact support@fundraisercommand.com. Include your order number and a description of the issue. Review the merchant’s applicable return policy at Shopify checkout before completing your purchase.",
  },
  Privacy: {
    title: "Your shopping information",
    copy: "This storefront saves your merchandise selection in this browser so your bag is available when you return. Checkout is handled by Shopify. The merchant’s privacy policy and checkout disclosures are available during checkout. Contact support@fundraisercommand.com for privacy questions.",
  },
  Terms: {
    title: "Before you order",
    copy: "Product prices and availability are verified when you proceed to checkout. Your final total, shipping charges, taxes, and the merchant’s applicable terms are presented by Shopify before you pay. Contact support@fundraisercommand.com if you need clarification before placing an order.",
  },
};
export function DmdStorefront({
  campaign,
  product,
}: {
  campaign: Campaign;
  product?: StoreProduct;
}) {
  preload("/brand/dmd/feature-regular.otf", {
    as: "font",
    type: "font/otf",
    crossOrigin: "anonymous",
  });
  preload("/brand/dmd/scto-medium.otf", {
    as: "font",
    type: "font/otf",
    crossOrigin: "anonymous",
  });
  const cart = useCampaignCart(campaign);
  const [cartOpen, setCartOpen] = useState(false);
  const [overlay, setOverlay] = useState<"menu" | "search" | null>(null);
  const [quick, setQuick] = useState<StoreProduct | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Shop all");
  const [sort, setSort] = useState("featured");
  const [scrolled, setScrolled] = useState(false);
  const [intro, setIntro] = useState(false);
  const dialog = useDialogAccessibility<HTMLDivElement>(
    !!overlay || !!quick || !!info,
    () => {
      setOverlay(null);
      setQuick(null);
      setInfo(null);
    },
  );
  const availableCategories = categories.filter(
    (c) => c === "Shop all" || campaign.products.some((p) => category(p) === c),
  );
  const products = useMemo(() => {
    const items = campaign.products.filter(
      (p) => filter === "Shop all" || category(p) === filter,
    );
    return sort === "featured"
      ? items
      : [...items].sort((a, b) =>
          sort === "low" ? a.minPrice - b.minPrice : b.minPrice - a.minPrice,
        );
  }, [campaign.products, filter, sort]);
  const results = campaign.products.filter((p) =>
    `${p.title} ${p.description} ${p.options.flatMap((o) => o.values).join(" ")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (
      product ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    try {
      if (sessionStorage.getItem("dmd-entered")) return;
      sessionStorage.setItem("dmd-entered", "1");
      setIntro(true);
      const id = setTimeout(() => setIntro(false), 1100);
      return () => clearTimeout(id);
    } catch {}
  }, [product]);
  function add(item: CartItem) {
    cart.add(item);
    setQuick(null);
    setOverlay(null);
    setCartOpen(true);
  }
  function shopCategory(c: string) {
    setFilter(c);
    document
      .getElementById("collection")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  return (
    <div
      className={
        "store-page dmd-theme dmd-cinema" + (product ? " dmd-pdp" : "")
      }
    >
      <a className="dmd-skip" href="#dmd-main">
        Skip to content
      </a>
      {intro && (
        <div className="dmd-entry" aria-hidden="true">
          <img
            src="/brand/dmd/wordmark-cream.svg"
            alt=""
            width="280"
            height="120"
          />
        </div>
      )}
      <header
        inert={!!overlay || !!quick || !!info || cartOpen}
        className={"dmd-header" + (scrolled || product ? " is-solid" : "")}
      >
        <div className="dmd-header-left">
          <button onClick={() => setOverlay("menu")} aria-label="Open menu">
            <span className="dmd-menu-icon" aria-hidden="true" />
            <span className="dmd-desktop">Menu</span>
          </button>
          <Link className="dmd-desktop" href={`${root(campaign)}#collection`}>
            Shop
          </Link>
        </div>
        <Link
          href={root(campaign)}
          className="dmd-header-mark"
          aria-label="Detroit Metropolitan Dance store"
        >
          <img
            src={
              scrolled || product ? DMD_LOGO : "/brand/dmd/wordmark-cream.svg"
            }
            width="170"
            height="70"
            alt="Detroit Metropolitan Dance"
          />
        </Link>
        <div className="dmd-header-right">
          <button className="dmd-desktop" onClick={() => setOverlay("search")}>
            Search
          </button>
          <button
            onClick={() => setCartOpen(true)}
            aria-label={`Open bag with ${cart.count} items`}
          >
            Bag{" "}
            <span className="dmd-bag-count">
              {cart.count.toString().padStart(2, "0")}
            </span>
          </button>
        </div>
      </header>
      <main id="dmd-main" inert={!!overlay || !!quick || !!info || cartOpen}>
        {product ? (
          <div className="dmd-pdp-body">
            <Link
              className="dmd-text-link"
              href={`${root(campaign)}#collection`}
            >
              ← The collection
            </Link>
            <Purchase
              key={product.id}
              campaign={campaign}
              product={product}
              onAdd={add}
            />
            {campaign.products.length > 1 && (
              <section className="dmd-related">
                <p className="dmd-label">KEEP EXPLORING</p>
                <h2>In good company.</h2>
                <div className="dmd-product-grid">
                  {campaign.products
                    .filter((p) => p.id !== product.id)
                    .slice(0, 2)
                    .map((p) => (
                      <ProductCard
                        key={p.id}
                        campaign={campaign}
                        product={p}
                        onQuick={setQuick}
                      />
                    ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            <section className="dmd-hero">
              <Image
                className="dmd-hero-media"
                src="/brand/dmd/company.webp"
                alt="Detroit Metropolitan Dance artists captured in motion"
                fill
                priority
                sizes="100vw"
              />
              <div className="dmd-hero-shade" />
              <div className="dmd-hero-heading">
                <p className="dmd-label">
                  DETROIT METROPOLITAN DANCE / OFFICIAL STORE
                </p>
                <h1>
                  <span>MOVE</span>
                  <span className="dmd-hero-second">
                    <em>with</em> US.
                  </span>
                </h1>
              </div>
              <div className="dmd-hero-bottom">
                <a className="dmd-button dmd-button-light" href="#collection">
                  Shop the collection <span>↗</span>
                </a>
                <p>
                  From the stage.
                  <br />
                  Into the everyday.
                </p>
                <a
                  className="dmd-scroll"
                  href="#statement"
                  aria-label="Discover the DMD collection"
                >
                  Scroll to explore <span>↓</span>
                </a>
              </div>
            </section>
            <section className="dmd-statement" id="statement">
              <p className="dmd-label">01 / A SHARED MOVEMENT</p>
              <h2>
                Rooted in Detroit.
                <br />
                <span>
                  Made to <em>move.</em>
                </span>
              </h2>
              <div>
                <span className="dmd-statement-rule" />
                <p>
                  For the artists. The audience.
                  <br />
                  And everyone who moves with us.
                  <br />
                  Wear your connection to DMD.
                </p>
              </div>
            </section>
            <section className="dmd-collection" id="collection">
              <div className="dmd-section-head">
                <div>
                  <p className="dmd-label">02 / OFFICIAL MERCHANDISE</p>
                  <h2>
                    The DMD
                    <br />
                    <em>collection.</em>
                  </h2>
                </div>
                <p>
                  {campaign.storefront_supporting_text ||
                    "A little of the stage. Wherever you go."}
                </p>
              </div>
              {campaign.storefront_header_message && (
                <p className="dmd-store-note">
                  {campaign.storefront_header_message}
                </p>
              )}
              {!campaignIsOpen(campaign) && (
                <p className="dmd-store-note">
                  The store is currently closed for orders. Explore the
                  collection below.
                </p>
              )}
              <div className="dmd-collection-tools">
                <nav aria-label="Merchandise categories">
                  {availableCategories.map((c) => (
                    <button
                      key={c}
                      aria-pressed={filter === c}
                      onClick={() => setFilter(c)}
                    >
                      {c}
                    </button>
                  ))}
                </nav>
                <label className="dmd-sort">
                  Sort{" "}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="featured">Featured</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                  </select>
                </label>
              </div>
              <p className="dmd-product-count" aria-live="polite">
                {products.length} piece{products.length === 1 ? "" : "s"}
              </p>
              <div className="dmd-product-grid">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    campaign={campaign}
                    product={p}
                    onQuick={setQuick}
                  />
                ))}
              </div>
              {!products.length && (
                <div className="dmd-empty">
                  <h3>The next movement is coming.</h3>
                  <p>
                    Our merchandise is being prepared. Check back for the
                    collection.
                  </p>
                </div>
              )}
            </section>
            <section className="dmd-lookbook" id="in-motion">
              <div className="dmd-lookbook-photo">
                <Image
                  src="/brand/dmd/performance.webp"
                  alt="DMD dancers performing together on stage at the Detroit Institute of Arts"
                  fill
                  sizes="100vw"
                />
                <div className="dmd-lookbook-title">
                  <p className="dmd-label">03 / OFF THE RACK. ON THE MOVE.</p>
                  <h2>
                    IN
                    <br />
                    <em>MOTION.</em>
                  </h2>
                </div>
              </div>
              <div className="dmd-lookbook-caption">
                <span>THE COMPANY / DETROIT METROPOLITAN DANCE</span>
                <a href="https://detroitmetdance.org/company">
                  Meet the company ↗
                </a>
              </div>
            </section>
            <section className="dmd-culture">
              <div>
                <p className="dmd-label">04 / LEGACY MEETS WHAT’S NEXT</p>
                <h2>
                  More than
                  <br />a name.
                  <br />
                  <em>A movement.</em>
                </h2>
              </div>
              <div className="dmd-culture-copy">
                <p>
                  Performance. Education. Community.
                  <br />A contemporary dance company with Detroit at its heart.
                </p>
                <p>Carry that connection beyond the theater.</p>
                <a
                  className="dmd-text-link"
                  href="https://detroitmetdance.org/company"
                >
                  Discover our world <span>↗</span>
                </a>
              </div>
            </section>
            {availableCategories.length > 1 && (
              <section className="dmd-category-section">
                <p className="dmd-label">FIND YOUR EVERYDAY</p>
                {availableCategories
                  .filter((c) => c !== "Shop all")
                  .map((c) => (
                    <button key={c} onClick={() => shopCategory(c)}>
                      <span>{c}</span>
                      <span>
                        (
                        {
                          campaign.products.filter((p) => category(p) === c)
                            .length
                        }
                        ) ↗
                      </span>
                    </button>
                  ))}
              </section>
            )}
          </>
        )}
      </main>
      <div inert={!!overlay || !!quick || !!info || cartOpen}>
        <Footer campaign={campaign} onInfo={setInfo} />
      </div>
      <CartDrawer
        campaign={campaign}
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
      {(overlay || quick || info) && (
        <div
          className={
            "dmd-overlay " +
            (quick ? "dmd-quick-overlay" : info ? "dmd-info-overlay" : "")
          }
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOverlay(null);
              setQuick(null);
              setInfo(null);
            }
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={
              quick
                ? `Quick view ${quick.title}`
                : info
                  ? information[info].title
                  : overlay === "menu"
                    ? "Navigation menu"
                    : "Search merchandise"
            }
            className="dmd-dialog"
          >
            <button
              className="dmd-close"
              aria-label="Close dialog"
              onClick={() => {
                setOverlay(null);
                setQuick(null);
                setInfo(null);
              }}
            >
              Close <span>×</span>
            </button>
            {quick ? (
              <Purchase
                key={quick.id}
                campaign={campaign}
                product={quick}
                onAdd={add}
                quick
              />
            ) : info ? (
              <div className="dmd-info-content">
                <p className="dmd-label">STORE INFORMATION</p>
                <h2>{information[info].title}</h2>
                <p>{information[info].copy}</p>
                <a
                  className="dmd-text-link"
                  href="mailto:support@fundraisercommand.com"
                >
                  Contact fulfillment ↗
                </a>
              </div>
            ) : overlay === "menu" ? (
              <div className="dmd-menu-content">
                <img
                  src="/brand/dmd/wordmark-cream.svg"
                  alt="Detroit Metropolitan Dance"
                  width="190"
                  height="80"
                />
                <nav aria-label="Main navigation">
                  <Link
                    href={`${root(campaign)}#collection`}
                    onClick={() => setOverlay(null)}
                  >
                    Shop <span>01</span>
                  </Link>
                  <Link
                    href={`${root(campaign)}#in-motion`}
                    onClick={() => setOverlay(null)}
                  >
                    In motion <span>02</span>
                  </Link>
                  <a href="https://detroitmetdance.org/company">
                    About DMD <span>03</span>
                  </a>
                </nav>
                <div className="dmd-menu-utility">
                  <button onClick={() => setOverlay("search")}>
                    Search merchandise ↗
                  </button>
                  <Link href={DMD_LOGIN}>Member access ↗</Link>
                  <a href="mailto:support@fundraisercommand.com">Contact ↗</a>
                </div>
              </div>
            ) : (
              <div className="dmd-search-content">
                <p className="dmd-label">THE DMD COLLECTION</p>
                <h2>
                  What are you
                  <br />
                  <em>looking for?</em>
                </h2>
                <label>
                  <span className="dmd-label">Search merchandise</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, color, or style"
                  />
                </label>
                <p aria-live="polite">
                  {results.length} result{results.length === 1 ? "" : "s"}
                </p>
                <div className="dmd-search-results">
                  {results.map((p) => (
                    <Link key={p.id} href={productUrl(campaign, p)}>
                      <MerchandiseImage image={p.images[0]} title={p.title} />
                      <span>{p.title}</span>
                      <span>{money(p.minPrice)} ↗</span>
                    </Link>
                  ))}
                </div>
                {!results.length && (
                  <p>No pieces match your search. Try another name or color.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
