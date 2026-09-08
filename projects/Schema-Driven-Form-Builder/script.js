"use strict";

const PRESETS = {
  user: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "User Registration",
    description: "Create your account to get started",
    type: "object",
    required: [
      "firstName",
      "lastName",
      "email",
      "password",
      "birthDate",
      "role",
    ],
    properties: {
      firstName: {
        type: "string",
        title: "First Name",
        minLength: 2,
        maxLength: 50,
        placeholder: "Jane",
      },
      lastName: {
        type: "string",
        title: "Last Name",
        minLength: 2,
        maxLength: 50,
        placeholder: "Doe",
      },
      email: {
        type: "string",
        title: "Email Address",
        format: "email",
        placeholder: "jane@example.com",
      },
      password: {
        type: "string",
        title: "Password",
        format: "password",
        minLength: 8,
        description: "At least 8 characters, mix of letters and numbers",
        pattern: "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
        "x-errorMessage":
          "Must be 8+ characters with at least one letter and number",
      },
      birthDate: { type: "string", title: "Date of Birth", format: "date" },
      role: {
        type: "string",
        title: "Account Role",
        enum: ["developer", "designer", "manager", "analyst", "other"],
        enumLabels: ["Developer", "Designer", "Manager", "Analyst", "Other"],
        "x-widget": "radio",
      },
      bio: {
        type: "string",
        title: "Short Bio",
        "x-widget": "textarea",
        maxLength: 300,
        placeholder: "Tell us a bit about yourself…",
      },
      website: {
        type: "string",
        title: "Personal Website",
        format: "uri",
        placeholder: "https://yoursite.com",
      },
      notifications: {
        type: "object",
        title: "Notification Preferences",
        properties: {
          email: {
            type: "boolean",
            title: "Email notifications",
            "x-widget": "toggle",
            default: true,
          },
          sms: {
            type: "boolean",
            title: "SMS notifications",
            "x-widget": "toggle",
            default: false,
          },
          push: {
            type: "boolean",
            title: "Push notifications",
            "x-widget": "toggle",
            default: true,
          },
        },
      },
      skills: {
        type: "array",
        title: "Skills",
        description: "Add your top skills",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "string",
          title: "Skill",
          placeholder: "e.g. React, Python…",
          minLength: 1,
        },
      },
      agreeTerms: {
        type: "boolean",
        title: "I agree to the Terms of Service and Privacy Policy",
        "x-widget": "checkbox",
      },
    },
    required: [
      "firstName",
      "lastName",
      "email",
      "password",
      "birthDate",
      "role",
      "agreeTerms",
    ],
    if: { properties: { role: { const: "developer" } }, required: ["role"] },
    then: {
      properties: {
        githubUrl: {
          type: "string",
          title: "GitHub Profile",
          format: "uri",
          placeholder: "https://github.com/username",
        },
        yearsExp: {
          type: "integer",
          title: "Years of Experience",
          minimum: 0,
          maximum: 40,
          "x-widget": "range",
        },
      },
    },
  },

  product: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Product Catalog Entry",
    description: "Add a new product to the catalog",
    type: "object",
    required: ["name", "sku", "price", "category", "status"],
    properties: {
      name: {
        type: "string",
        title: "Product Name",
        minLength: 3,
        maxLength: 120,
        placeholder: "Wireless Noise-Cancelling Headphones",
      },
      sku: {
        type: "string",
        title: "SKU Code",
        pattern: "^[A-Z]{2,4}-\\d{4,8}$",
        placeholder: "ELEC-00123",
        description: "Format: 2-4 uppercase letters, hyphen, 4-8 digits",
      },
      price: {
        type: "number",
        title: "Price (USD)",
        minimum: 0,
        exclusiveMinimum: 0,
        multipleOf: 0.01,
        placeholder: "99.99",
      },
      comparePrice: {
        type: "number",
        title: "Compare-at Price",
        minimum: 0,
        placeholder: "149.99",
        description: "Original price before discount",
      },
      category: {
        type: "string",
        title: "Category",
        enum: [
          "electronics",
          "clothing",
          "books",
          "home",
          "sports",
          "beauty",
          "toys",
        ],
        enumLabels: [
          "Electronics",
          "Clothing & Apparel",
          "Books & Media",
          "Home & Garden",
          "Sports & Outdoors",
          "Beauty & Health",
          "Toys & Games",
        ],
      },
      status: {
        type: "string",
        title: "Listing Status",
        enum: ["active", "draft", "archived"],
        enumLabels: ["Active (visible)", "Draft (hidden)", "Archived"],
        "x-widget": "radio",
      },
      description: {
        type: "string",
        title: "Product Description",
        "x-widget": "textarea",
        minLength: 20,
        maxLength: 2000,
        placeholder:
          "Describe the product features, benefits, and specifications…",
      },
      color: { type: "string", title: "Brand Color", format: "color" },
      stock: {
        type: "integer",
        title: "Stock Quantity",
        minimum: 0,
        default: 0,
      },
      weight: { type: "number", title: "Weight (kg)", minimum: 0 },
      tags: {
        type: "array",
        title: "Tags",
        maxItems: 10,
        items: { type: "string", title: "Tag", maxLength: 30 },
      },
      images: {
        type: "array",
        title: "Image URLs",
        items: { type: "string", title: "Image URL", format: "uri" },
      },
      dimensions: {
        type: "object",
        title: "Package Dimensions (cm)",
        properties: {
          length: { type: "number", title: "Length", minimum: 0 },
          width: { type: "number", title: "Width", minimum: 0 },
          height: { type: "number", title: "Height", minimum: 0 },
        },
      },
      seoTitle: {
        type: "string",
        title: "SEO Title",
        maxLength: 60,
        placeholder: "Buy Wireless Headphones Online | BrandName",
      },
      seoDescription: {
        type: "string",
        title: "SEO Meta Description",
        "x-widget": "textarea",
        maxLength: 160,
      },
    },
  },

  api: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "API Configuration",
    description: "Configure your API integration settings",
    type: "object",
    required: ["name", "baseUrl", "authType"],
    $defs: {
      header: {
        type: "object",
        required: ["key", "value"],
        properties: {
          key: {
            type: "string",
            title: "Header Name",
            placeholder: "X-Custom-Header",
          },
          value: {
            type: "string",
            title: "Header Value",
            placeholder: "my-value",
          },
        },
      },
    },
    properties: {
      name: {
        type: "string",
        title: "Integration Name",
        minLength: 2,
        maxLength: 64,
      },
      baseUrl: {
        type: "string",
        title: "Base URL",
        format: "uri",
        placeholder: "https://api.example.com/v2",
      },
      timeout: {
        type: "integer",
        title: "Timeout (ms)",
        minimum: 100,
        maximum: 60000,
        default: 5000,
        "x-widget": "range",
      },
      retries: {
        type: "integer",
        title: "Retry Attempts",
        minimum: 0,
        maximum: 5,
        default: 3,
        "x-widget": "range",
      },
      authType: {
        type: "string",
        title: "Authentication Type",
        enum: ["none", "apiKey", "bearer", "basic", "oauth2"],
        enumLabels: [
          "None",
          "API Key",
          "Bearer Token",
          "Basic Auth",
          "OAuth 2.0",
        ],
        "x-widget": "radio",
      },
      rateLimit: {
        type: "integer",
        title: "Rate Limit (req/min)",
        minimum: 1,
        maximum: 10000,
        default: 60,
      },
      headers: {
        type: "array",
        title: "Custom Headers",
        items: { $ref: "#/$defs/header" },
      },
      logging: {
        type: "object",
        title: "Logging Options",
        properties: {
          enabled: {
            type: "boolean",
            title: "Enable request logging",
            "x-widget": "toggle",
            default: true,
          },
          level: {
            type: "string",
            title: "Log Level",
            enum: ["debug", "info", "warn", "error"],
            default: "info",
          },
          sensitive: {
            type: "boolean",
            title: "Mask sensitive fields in logs",
            "x-widget": "toggle",
            default: true,
          },
        },
      },
      webhookUrl: {
        type: "string",
        title: "Webhook URL",
        format: "uri",
        placeholder: "https://yourapp.com/webhooks/api",
      },
    },
    oneOf: [
      {
        "x-title": "API Key Auth",
        "x-description": "Authenticate using a static API key",
        properties: {
          apiKey: {
            type: "string",
            title: "API Key",
            format: "password",
            minLength: 16,
          },
          keyHeader: {
            type: "string",
            title: "Key Header Name",
            default: "X-API-Key",
            placeholder: "X-API-Key",
          },
        },
        required: ["apiKey"],
      },
      {
        "x-title": "Bearer Token",
        "x-description": "Use a JWT or bearer token for authorization",
        properties: {
          bearerToken: {
            type: "string",
            title: "Bearer Token",
            format: "password",
            minLength: 10,
          },
        },
        required: ["bearerToken"],
      },
      {
        "x-title": "Basic Auth",
        "x-description": "Username and password credentials",
        properties: {
          username: { type: "string", title: "Username", minLength: 1 },
          basicPassword: {
            type: "string",
            title: "Password",
            format: "password",
            minLength: 1,
          },
        },
        required: ["username", "basicPassword"],
      },
    ],
  },

  survey: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Customer Satisfaction Survey",
    description: "Help us improve by sharing your experience",
    type: "object",
    required: ["overallRating", "recommend"],
    properties: {
      overallRating: {
        type: "integer",
        title: "Overall Satisfaction",
        minimum: 1,
        maximum: 10,
        "x-widget": "range",
        description: "1 = Very Unsatisfied, 10 = Extremely Satisfied",
      },
      recommend: {
        type: "integer",
        title: "Likelihood to Recommend (NPS)",
        minimum: 0,
        maximum: 10,
        "x-widget": "range",
        description: "0 = Not at all likely, 10 = Extremely likely",
      },
      usedFeatures: {
        type: "array",
        title: "Features You Used",
        "x-widget": "checkbox-group",
        items: {
          type: "string",
          enum: [
            "dashboard",
            "reporting",
            "api",
            "integrations",
            "mobile",
            "support",
          ],
          enumLabels: [
            "Dashboard",
            "Reporting",
            "API Access",
            "Integrations",
            "Mobile App",
            "Support Chat",
          ],
        },
      },
      strengths: {
        type: "string",
        title: "What did we do well?",
        "x-widget": "textarea",
        maxLength: 1000,
        placeholder: "Tell us what you appreciated most…",
      },
      improvements: {
        type: "string",
        title: "What could we improve?",
        "x-widget": "textarea",
        maxLength: 1000,
        placeholder: "Be as specific as you like…",
      },
      supportQuality: {
        type: "integer",
        title: "Support Quality",
        minimum: 1,
        maximum: 5,
        "x-widget": "range",
      },
      plan: {
        type: "string",
        title: "Your Current Plan",
        enum: ["free", "starter", "pro", "enterprise"],
        enumLabels: ["Free", "Starter", "Pro", "Enterprise"],
      },
      contactConsent: {
        type: "boolean",
        title: "I'm happy to be contacted for follow-up",
        "x-widget": "toggle",
      },
      contactEmail: {
        type: "string",
        title: "Contact Email",
        format: "email",
        placeholder: "Your email for follow-up",
      },
      additionalComments: {
        type: "string",
        title: "Any other comments?",
        "x-widget": "textarea",
        maxLength: 2000,
      },
    },
    dependencies: {
      contactConsent: {
        oneOf: [
          {
            properties: { contactConsent: { enum: [true] } },
            required: ["contactEmail"],
          },
          { properties: { contactConsent: { enum: [false] } } },
        ],
      },
    },
  },

  payment: {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Payment Details",
    description: "Secure payment information entry",
    type: "object",
    required: [
      "cardholderName",
      "cardNumber",
      "expiry",
      "cvv",
      "billingAddress",
    ],
    properties: {
      paymentMethod: {
        type: "string",
        title: "Payment Method",
        enum: ["card", "paypal", "bank"],
        enumLabels: ["Credit / Debit Card", "PayPal", "Bank Transfer"],
        "x-widget": "radio",
        default: "card",
      },
      cardholderName: {
        type: "string",
        title: "Cardholder Name",
        minLength: 2,
        maxLength: 80,
        placeholder: "Jane Doe",
      },
      cardNumber: {
        type: "string",
        title: "Card Number",
        pattern: "^[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}$",
        placeholder: "1234 5678 9012 3456",
        "x-errorMessage": "Enter a valid 16-digit card number",
      },
      expiry: {
        type: "string",
        title: "Expiry Date",
        pattern: "^(0[1-9]|1[0-2])\\/([0-9]{2})$",
        placeholder: "MM/YY",
        "x-errorMessage": "Use MM/YY format",
      },
      cvv: {
        type: "string",
        title: "CVV / CVC",
        pattern: "^[0-9]{3,4}$",
        placeholder: "123",
        "x-errorMessage": "3 or 4 digit security code",
      },
      saveCard: {
        type: "boolean",
        title: "Save this card for future payments",
        "x-widget": "toggle",
        default: false,
      },
      billingAddress: {
        type: "object",
        title: "Billing Address",
        required: ["street", "city", "country", "postalCode"],
        properties: {
          street: {
            type: "string",
            title: "Street Address",
            minLength: 5,
            placeholder: "123 Main Street",
          },
          city: {
            type: "string",
            title: "City",
            minLength: 2,
            placeholder: "San Francisco",
          },
          state: {
            type: "string",
            title: "State / Province",
            placeholder: "CA",
          },
          postalCode: {
            type: "string",
            title: "Postal / ZIP Code",
            pattern: "^[A-Z0-9\\s-]{3,10}$",
            placeholder: "94102",
          },
          country: {
            type: "string",
            title: "Country",
            enum: ["US", "GB", "CA", "AU", "DE", "FR", "IN", "JP", "SG", "AE"],
            enumLabels: [
              "United States",
              "United Kingdom",
              "Canada",
              "Australia",
              "Germany",
              "France",
              "India",
              "Japan",
              "Singapore",
              "UAE",
            ],
          },
        },
      },
      amount: {
        type: "number",
        title: "Payment Amount (USD)",
        minimum: 0.01,
        placeholder: "0.00",
      },
      currency: {
        type: "string",
        title: "Currency",
        enum: ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY"],
        default: "USD",
      },
      notes: {
        type: "string",
        title: "Payment Notes",
        "x-widget": "textarea",
        maxLength: 200,
        placeholder: "Reference number, purchase order, etc.",
      },
    },
  },
};

const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on"))
      e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children
    .flat()
    .forEach(
      (c) =>
        c != null &&
        e.append(typeof c === "string" ? document.createTextNode(c) : c),
    );
  return e;
};

let rootSchema = null;
let formSchema = null;
let conditionalWatchers = [];
let dependencyWatchers = [];
let arrayCounters = {};

function resolveRef(ref, root) {
  if (!ref || !ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  return parts.reduce(
    (obj, k) => (obj && obj[k] !== undefined ? obj[k] : null),
    root,
  );
}

function normalizeSchema(schema, root) {
  if (!schema || typeof schema !== "object") return schema;
  if (schema.$ref) {
    const resolved =
      resolveRef(schema.$ref, root) ||
      resolveRef(schema.$ref.replace("$defs", "definitions"), root);
    return resolved
      ? normalizeSchema({ ...resolved, ...schema, $ref: undefined }, root)
      : schema;
  }
  if (schema.allOf) {
    return schema.allOf.reduce(
      (acc, sub) => {
        const n = normalizeSchema(sub, root);
        const merged = { ...acc, ...n };
        if (acc.properties || n.properties)
          merged.properties = { ...acc.properties, ...n.properties };
        if (acc.required || n.required)
          merged.required = [...(acc.required || []), ...(n.required || [])];
        return merged;
      },
      { ...schema, allOf: undefined },
    );
  }
  return schema;
}

function makeid() {
  return "f" + Math.random().toString(36).slice(2, 9);
}

function typeBadge(schema) {
  const map = {
    string: "str",
    number: "num",
    integer: "int",
    boolean: "bool",
    array: "arr",
    object: "obj",
  };
  const format = schema.format ? `·${schema.format}` : "";
  const widget = schema["x-widget"] ? `·${schema["x-widget"]}` : "";
  return (map[schema.type] || schema.type || "any") + format + widget;
}

function buildLabel(title, name, required, schema) {
  const id = `field-${name}`;
  const lbl = el("label", { class: "field-label", for: id });
  lbl.append(title || name);
  if (required)
    lbl.append(el("span", { class: "req-star", title: "Required" }, "★"));
  lbl.append(el("span", { class: "field-type-badge" }, typeBadge(schema)));
  return lbl;
}

function buildError(id) {
  const e = el("span", {
    class: "field-err hidden",
    id: `err-${id}`,
    role: "alert",
  });
  return e;
}

function showError(id, msg) {
  const e = document.getElementById(`err-${id}`);
  if (e) {
    e.textContent = msg;
    e.classList.remove("hidden");
  }
}

function clearError(id) {
  const e = document.getElementById(`err-${id}`);
  if (e) {
    e.textContent = "";
    e.classList.add("hidden");
  }
}

function attachValidation(input, schema, id) {
  const check = () => validateInput(input, schema, id);
  input.addEventListener("blur", check);
  input.addEventListener("input", () => {
    if (!input.classList.contains("invalid")) return;
    check();
  });
}

function validateInput(input, schema, id) {
  if (input.disabled || input.readOnly) return true;
  const raw = input.type === "checkbox" ? input.checked : input.value;
  const val =
    input.type === "number" || input.type === "range"
      ? raw === ""
        ? null
        : Number(raw)
      : raw;
  const errors = [];

  if (schema.required && (val === "" || val === null || val === undefined)) {
    errors.push(schema["x-errorMessage"] || "This field is required");
  }
  if (input.type !== "checkbox" && val !== "" && val !== null) {
    if (
      schema.minLength &&
      typeof val === "string" &&
      val.length < schema.minLength
    )
      errors.push(`Minimum ${schema.minLength} characters`);
    if (
      schema.maxLength &&
      typeof val === "string" &&
      val.length > schema.maxLength
    )
      errors.push(`Maximum ${schema.maxLength} characters`);
    if (
      schema.pattern &&
      typeof val === "string" &&
      !new RegExp(schema.pattern).test(val)
    )
      errors.push(
        schema["x-errorMessage"] || `Must match pattern: ${schema.pattern}`,
      );
    if (
      schema.minimum !== undefined &&
      typeof val === "number" &&
      val < schema.minimum
    )
      errors.push(`Minimum value: ${schema.minimum}`);
    if (
      schema.maximum !== undefined &&
      typeof val === "number" &&
      val > schema.maximum
    )
      errors.push(`Maximum value: ${schema.maximum}`);
    if (
      schema.exclusiveMinimum !== undefined &&
      typeof val === "number" &&
      val <= schema.exclusiveMinimum
    )
      errors.push(`Must be greater than ${schema.exclusiveMinimum}`);
    if (
      schema.exclusiveMaximum !== undefined &&
      typeof val === "number" &&
      val >= schema.exclusiveMaximum
    )
      errors.push(`Must be less than ${schema.exclusiveMaximum}`);
    if (
      schema.multipleOf &&
      typeof val === "number" &&
      Math.round(val / schema.multipleOf) !== val / schema.multipleOf
    )
      errors.push(`Must be a multiple of ${schema.multipleOf}`);
    if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
      errors.push("Enter a valid email address");
    if (
      (schema.format === "uri" || schema.format === "url") &&
      !/^https?:\/\/.+/.test(val)
    )
      errors.push("Enter a valid URL (starting with http:// or https://)");
    if (
      schema.format === "uuid" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      )
    )
      errors.push("Enter a valid UUID");
  }

  if (errors.length) {
    input.classList.add("invalid");
    input.classList.remove("valid");
    showError(id, errors[0]);
    return false;
  } else {
    input.classList.remove("invalid");
    input.classList.add("valid");
    clearError(id);
    return true;
  }
}

function renderStringField(schema, name, path, required) {
  const id = `field-${path.join("-")}`;
  const wrap = el("div", {
    class: "field-wrap",
    "data-path": path.join("."),
    "data-readonly": schema.readOnly ? "true" : "false",
  });
  wrap.append(buildLabel(schema.title || name, id, required, schema));
  if (schema.description)
    wrap.append(el("span", { class: "field-desc" }, schema.description));

  const widget =
    schema["x-widget"] || (schema.format === "color" ? "color" : null);
  let input;

  if (widget === "textarea") {
    input = el("textarea", {
      class: "field-input",
      id,
      name: path.join("."),
      placeholder: schema.placeholder || "",
    });
    if (schema.maxLength) {
      const counter = el(
        "span",
        { class: "char-counter" },
        `0 / ${schema.maxLength}`,
      );
      input.addEventListener("input", () => {
        const l = input.value.length;
        counter.textContent = `${l} / ${schema.maxLength}`;
        counter.className =
          "char-counter" +
          (l >= schema.maxLength
            ? " at"
            : l >= schema.maxLength * 0.9
              ? " near"
              : "");
      });
      const row = el("div", { class: "field-meta-row" });
      const errEl = buildError(id);
      row.append(errEl, counter);
      wrap.append(input, row);
    } else {
      wrap.append(input, buildError(id));
    }
  } else if (widget === "color" || schema.format === "color") {
    const colorWrap = el("div", { class: "color-wrap" });
    input = el("input", {
      type: "color",
      class: "field-input",
      id,
      name: path.join("."),
      value: schema.default || "#3b82f6",
    });
    const colorVal = el(
      "span",
      { class: "color-value" },
      schema.default || "#3b82f6",
    );
    input.addEventListener("input", () => {
      colorVal.textContent = input.value;
    });
    colorWrap.append(input, colorVal);
    wrap.append(colorWrap, buildError(id));
  } else if (schema.format === "password") {
    const row = el("div", { class: "field-input-row" });
    input = el("input", {
      type: "password",
      class: "field-input",
      id,
      name: path.join("."),
      placeholder: schema.placeholder || "",
    });
    const toggle = el(
      "button",
      {
        type: "button",
        class: "btn btn-xs btn-ghost",
        style: { flexShrink: "0", fontSize: "11px" },
      },
      "Show",
    );
    toggle.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      toggle.textContent = input.type === "password" ? "Show" : "Hide";
    });
    row.append(input, toggle);
    if (schema.minLength || schema.maxLength) {
      const counter = el(
        "span",
        { class: "char-counter" },
        schema.minLength
          ? `Min ${schema.minLength} chars`
          : `Max ${schema.maxLength}`,
      );
      input.addEventListener("input", () => {
        const l = input.value.length;
        if (schema.maxLength) {
          counter.textContent = `${l} / ${schema.maxLength}`;
          counter.className =
            "char-counter" +
            (l >= schema.maxLength
              ? " at"
              : l >= schema.maxLength * 0.9
                ? " near"
                : "");
        } else counter.textContent = `${l} chars`;
      });
      const metaRow = el("div", { class: "field-meta-row" });
      metaRow.append(buildError(id), counter);
      wrap.append(row, metaRow);
    } else {
      wrap.append(row, buildError(id));
    }
  } else if (widget === "file") {
    input = el("input", {
      type: "file",
      class: "file-input-hidden",
      id,
      name: path.join("."),
    });
    if (schema.accept) input.setAttribute("accept", schema.accept);
    const fileWrap = el("div", { class: "file-wrap" });
    const dropZone = el("div", { class: "file-drop", tabindex: "0" });
    dropZone.innerHTML = `<div class="file-drop-icon">📎</div><div class="file-drop-text"><strong>Click to upload</strong> or drag and drop</div>`;
    const preview = el("div", { class: "file-preview hidden" });
    dropZone.addEventListener("click", () => input.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () =>
      dropZone.classList.remove("drag-over"),
    );
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) showFilePreview(file, dropZone, preview);
    });
    input.addEventListener("change", () => {
      if (input.files[0]) showFilePreview(input.files[0], dropZone, preview);
    });
    function showFilePreview(file, zone, prev) {
      zone.classList.add("hidden");
      prev.classList.remove("hidden");
      prev.innerHTML = "";
      const sz =
        file.size < 1024
          ? `${file.size} B`
          : file.size < 1048576
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / 1048576).toFixed(1)} MB`;
      const nm = el("span", { class: "file-preview-name" }, `📄 ${file.name}`);
      const szEl = el("span", { class: "file-preview-size" }, sz);
      const rm = el(
        "button",
        { type: "button", class: "file-preview-remove", title: "Remove" },
        "✕",
      );
      rm.addEventListener("click", () => {
        input.value = "";
        zone.classList.remove("hidden");
        prev.classList.add("hidden");
      });
      prev.append(nm, szEl, rm);
    }
    fileWrap.append(input, dropZone, preview, buildError(id));
    wrap.append(fileWrap);
    return wrap;
  } else {
    const typeMap = {
      email: "email",
      uri: "url",
      url: "url",
      date: "date",
      time: "time",
      "datetime-local": "datetime-local",
      month: "month",
      week: "week",
      search: "search",
    };
    const inputType = typeMap[schema.format] || "text";
    input = el("input", {
      type: inputType,
      class: "field-input",
      id,
      name: path.join("."),
      placeholder: schema.placeholder || "",
    });
    if (schema.pattern) input.setAttribute("pattern", schema.pattern);
    if (schema.minLength) input.setAttribute("minlength", schema.minLength);
    if (schema.maxLength) input.setAttribute("maxlength", schema.maxLength);
    if (schema.readOnly) input.setAttribute("readonly", "true");

    if (schema.maxLength) {
      const counter = el(
        "span",
        { class: "char-counter" },
        `0 / ${schema.maxLength}`,
      );
      input.addEventListener("input", () => {
        const l = input.value.length;
        counter.textContent = `${l} / ${schema.maxLength}`;
        counter.className =
          "char-counter" +
          (l >= schema.maxLength
            ? " at"
            : l >= schema.maxLength * 0.9
              ? " near"
              : "");
      });
      const row = el("div", { class: "field-meta-row" });
      row.append(buildError(id), counter);
      if (schema.pattern) {
        const ph = el(
          "div",
          { class: "pattern-hint" },
          `Pattern: ${schema.pattern}`,
        );
        wrap.append(input, ph, row);
      } else {
        wrap.append(input, row);
      }
    } else {
      if (schema.pattern)
        wrap.append(
          input,
          el("div", { class: "pattern-hint" }, `Pattern: ${schema.pattern}`),
          buildError(id),
        );
      else wrap.append(input, buildError(id));
    }
  }

  if (input) {
    if (schema.default !== undefined && !input.value)
      input.value = schema.default;
    attachValidation(input, { ...schema, required }, id);
  }
  return wrap;
}

function renderNumberField(schema, name, path, required) {
  const id = `field-${path.join("-")}`;
  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });
  wrap.append(buildLabel(schema.title || name, id, required, schema));
  if (schema.description)
    wrap.append(el("span", { class: "field-desc" }, schema.description));

  const widget = schema["x-widget"];

  if (widget === "range") {
    const min = schema.minimum ?? 0;
    const max = schema.maximum ?? 100;
    const def = schema.default ?? min;
    const rangeWrap = el("div", { class: "range-wrap" });
    const input = el("input", {
      type: "range",
      class: "field-input",
      id,
      name: path.join("."),
      min: String(min),
      max: String(max),
      step: schema.multipleOf || (schema.type === "integer" ? "1" : "any"),
      value: String(def),
    });
    const displayRow = el("div", { class: "range-display" });
    const minLbl = el("span", {}, String(min));
    const valDisp = el("span", { class: "range-value" }, String(def));
    const maxLbl = el("span", {}, String(max));
    displayRow.append(minLbl, valDisp, maxLbl);
    input.addEventListener("input", () => {
      valDisp.textContent = input.value;
    });
    rangeWrap.append(input, displayRow);
    wrap.append(rangeWrap, buildError(id));
    attachValidation(input, { ...schema, required }, id);
    return wrap;
  }

  const row = el("div", { class: "field-input-row" });
  const input = el("input", {
    type: "number",
    class: "field-input",
    id,
    name: path.join("."),
    placeholder: schema.placeholder || "",
  });
  if (schema.minimum !== undefined) input.setAttribute("min", schema.minimum);
  if (schema.maximum !== undefined) input.setAttribute("max", schema.maximum);
  if (schema.multipleOf) input.setAttribute("step", schema.multipleOf);
  else if (schema.type === "integer") input.setAttribute("step", "1");
  else input.setAttribute("step", "any");
  if (schema.default !== undefined) input.value = schema.default;
  if (schema["x-unit"])
    row.append(input, el("span", { class: "input-suffix" }, schema["x-unit"]));
  else row.append(input);
  wrap.append(row, buildError(id));
  attachValidation(input, { ...schema, required }, id);
  return wrap;
}

function renderBooleanField(schema, name, path, required) {
  const id = `field-${path.join("-")}`;
  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });

  const widget = schema["x-widget"];

  if (widget === "toggle") {
    wrap.append(buildLabel(schema.title || name, id, required, schema));
    const toggleWrap = el("div", { class: "toggle-wrap" });
    const label = el("label", { class: "toggle" });
    const input = el("input", { type: "checkbox", id, name: path.join(".") });
    if (schema.default) input.checked = true;
    const slider = el("span", { class: "toggle-slider" });
    label.append(input, slider);
    toggleWrap.append(label);
    wrap.append(toggleWrap);
    attachValidation(input, { ...schema, required }, id);
    return wrap;
  }

  if (widget === "checkbox") {
    const optionWrap = el("label", { class: "checkbox-option" });
    const input = el("input", {
      type: "checkbox",
      class: "field-check",
      id,
      name: path.join("."),
    });
    if (schema.default) input.checked = true;
    optionWrap.append(input, schema.title || name);
    wrap.append(optionWrap, buildError(id));
    attachValidation(input, { ...schema, required }, id);
    return wrap;
  }

  wrap.append(buildLabel(schema.title || name, id, required, schema));
  const optionWrap = el("label", { class: "checkbox-option" });
  const input = el("input", {
    type: "checkbox",
    class: "field-check",
    id,
    name: path.join("."),
  });
  if (schema.default) input.checked = true;
  optionWrap.append(input, "Yes");
  wrap.append(optionWrap, buildError(id));
  attachValidation(input, { ...schema, required }, id);
  return wrap;
}

function renderEnumField(schema, name, path, required) {
  const id = `field-${path.join("-")}`;
  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });
  wrap.append(buildLabel(schema.title || name, id, required, schema));
  if (schema.description)
    wrap.append(el("span", { class: "field-desc" }, schema.description));

  const widget = schema["x-widget"];
  const opts = schema.enum || [];
  const labels = schema.enumLabels || opts;

  if (widget === "radio") {
    const grp = el("div", { class: "radio-group", role: "radiogroup" });
    opts.forEach((val, i) => {
      const optId = `${id}-${i}`;
      const lbl = el("label", { class: "radio-option", for: optId });
      const inp = el("input", {
        type: "radio",
        class: "field-radio",
        id: optId,
        name: path.join("."),
        value: val,
      });
      if (schema.default === val) inp.checked = true;
      lbl.append(inp, labels[i] || val);
      grp.append(lbl);
    });
    wrap.append(grp, buildError(id));
    grp
      .querySelectorAll("input")
      .forEach((inp) => attachValidation(inp, { ...schema, required }, id));
    return wrap;
  }

  if (widget === "checkbox-group") {
    const grp = el("div", { class: "checkbox-group" });
    opts.forEach((val, i) => {
      const optId = `${id}-${i}`;
      const lbl = el("label", { class: "checkbox-option", for: optId });
      const inp = el("input", {
        type: "checkbox",
        class: "field-check",
        id: optId,
        name: `${path.join(".")}[]`,
        value: val,
      });
      lbl.append(inp, labels[i] || val);
      grp.append(lbl);
    });
    wrap.append(grp, buildError(id));
    return wrap;
  }

  const select = el("select", {
    class: "field-input",
    id,
    name: path.join("."),
  });
  if (!required) select.append(el("option", { value: "" }, "— Select —"));
  opts.forEach((val, i) => {
    const opt = el("option", { value: val }, labels[i] || val);
    if (schema.default === val) opt.selected = true;
    select.append(opt);
  });
  wrap.append(select, buildError(id));
  attachValidation(select, { ...schema, required }, id);
  return wrap;
}

function renderConstField(schema, name, path) {
  const id = `field-${path.join("-")}`;
  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });
  wrap.append(buildLabel(schema.title || name, id, false, schema));
  const row = el("div", { class: "const-field" });
  const display = el("div", { class: "const-value" }, String(schema.const));
  const hidden = el("input", {
    type: "hidden",
    name: path.join("."),
    value: String(schema.const),
  });
  row.append(display, hidden);
  wrap.append(row);
  return wrap;
}

function renderArrayField(schema, name, path, required, root) {
  const id = `field-${path.join("-")}`;
  const itemSchema = normalizeSchema(schema.items || { type: "string" }, root);
  const minItems = schema.minItems ?? 0;
  const maxItems = schema.maxItems ?? Infinity;
  const counterKey = path.join(".");
  arrayCounters[counterKey] = 0;

  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });

  const labelRow = el("div", { class: "field-label" });
  labelRow.append(schema.title || name);
  if (required) labelRow.append(el("span", { class: "req-star" }, "★"));
  labelRow.append(el("span", { class: "field-type-badge" }, "arr"));
  wrap.append(labelRow);
  if (schema.description)
    wrap.append(el("span", { class: "field-desc" }, schema.description));

  const arrayWrap = el("div", { class: "array-wrap", id: `arrwrap-${id}` });

  const counterEl = el("span", { class: "array-counter" }, `0 items`);
  if (schema.minItems) counterEl.title = `Min: ${schema.minItems}`;
  if (schema.maxItems) counterEl.title += ` Max: ${schema.maxItems}`;

  const addBtn = el(
    "button",
    { type: "button", class: "btn-add-item" },
    "+ Add Item",
  );

  function updateCounter() {
    const count = arrayWrap.querySelectorAll(".array-item").length;
    counterEl.textContent = `${count} item${count !== 1 ? "s" : ""}`;
    if (minItems && count < minItems)
      counterEl.textContent += ` (min ${minItems})`;
    addBtn.disabled = count >= maxItems;
  }

  function makeArrayItem(index) {
    const itemWrap = el("div", { class: "array-item" });
    const drag = el(
      "span",
      { class: "array-item-drag", title: "Drag to reorder" },
      "⠿",
    );
    const idxEl = el("span", { class: "array-item-idx" }, String(index + 1));
    const body = el("div", { class: "array-item-body" });
    const removeBtn = el(
      "button",
      { type: "button", class: "array-item-remove", title: "Remove item" },
      "✕",
    );

    const itemPath = [...path, String(index)];

    if (itemSchema.type === "object" && itemSchema.properties) {
      Object.entries(itemSchema.properties).forEach(([k, s]) => {
        const ns = normalizeSchema(s, root);
        const isReq = (itemSchema.required || []).includes(k);
        body.append(renderField(ns, k, [...itemPath, k], isReq, root));
      });
    } else {
      body.append(
        renderField(itemSchema, String(index), itemPath, false, root),
      );
    }

    removeBtn.addEventListener("click", () => {
      itemWrap.style.transition = "opacity 0.15s, transform 0.15s";
      itemWrap.style.opacity = "0";
      itemWrap.style.transform = "translateX(16px)";
      setTimeout(() => {
        itemWrap.remove();
        reindexItems();
        updateCounter();
        updateProgress();
      }, 150);
    });

    setupDrag(drag, itemWrap, arrayWrap, updateCounter);
    itemWrap.append(drag, idxEl, body, removeBtn);
    return itemWrap;
  }

  function reindexItems() {
    arrayWrap.querySelectorAll(".array-item").forEach((item, i) => {
      const idx = item.querySelector(".array-item-idx");
      if (idx) idx.textContent = String(i + 1);
    });
  }

  addBtn.addEventListener("click", () => {
    const count = arrayWrap.querySelectorAll(".array-item").length;
    if (count >= maxItems) return;
    arrayWrap.append(makeArrayItem(count));
    updateCounter();
    updateProgress();
  });

  for (let i = 0; i < Math.max(minItems, 0); i++) {
    arrayWrap.append(makeArrayItem(i));
  }

  const controls = el("div", { class: "array-controls" });
  controls.append(addBtn);
  wrap.append(arrayWrap, controls, counterEl, buildError(id));
  updateCounter();
  return wrap;
}

function setupDrag(handle, item, container, onReorder) {
  let dragging = false,
    startY = 0,
    startTop = 0;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    item.style.opacity = "0.7";
    item.style.zIndex = "10";
    item.style.position = "relative";
    const move = (me) => {
      if (!dragging) return;
      const dy = me.clientY - startY;
      const siblings = [...container.querySelectorAll(".array-item")].filter(
        (s) => s !== item,
      );
      const rect = item.getBoundingClientRect();
      const midY = rect.top + dy + rect.height / 2;
      let target = null;
      siblings.forEach((s) => {
        const sr = s.getBoundingClientRect();
        if (midY > sr.top + sr.height / 2) target = s;
      });
      if (target) container.insertBefore(item, target.nextSibling);
      else if (siblings.length) container.insertBefore(item, siblings[0]);
    };
    const up = () => {
      dragging = false;
      item.style.opacity = "";
      item.style.zIndex = "";
      item.style.position = "";
      onReorder && onReorder();
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

function renderObjectField(schema, name, path, required, root) {
  const id = `field-${path.join("-")}`;
  const nest = el("div", { class: "object-nest", id });
  const hd = el("div", { class: "object-nest-hd" });
  const titleEl = el("span", { class: "object-nest-title" });
  titleEl.append(el("span", {}, "⬡ "), schema.title || name);
  if (required) titleEl.append(el("span", { class: "req-star" }, " ★"));
  const arrow = el("span", { class: "object-nest-arrow" }, "▾");
  hd.append(titleEl, arrow);
  hd.addEventListener("click", () => nest.classList.toggle("collapsed"));

  const body = el("div", { class: "object-nest-body" });

  if (schema.properties) {
    const reqFields = schema.required || [];
    Object.entries(schema.properties).forEach(([k, s]) => {
      const ns = normalizeSchema(s, root);
      body.append(
        renderField(ns, k, [...path, k], reqFields.includes(k), root),
      );
    });
  }

  nest.append(hd, body);
  const wrap = el("div", { class: "field-wrap", "data-path": path.join(".") });
  wrap.append(nest);
  return wrap;
}

function renderOneOfField(schema, path, root) {
  const container = el("div", { class: "oneof-container" });
  const variants = schema.oneOf || [];

  const tabsEl = el("div", { class: "oneof-tabs", role: "tablist" });
  const panels = [];

  variants.forEach((v, i) => {
    const nv = normalizeSchema(v, root);
    const label = nv["x-title"] || v["x-title"] || `Option ${i + 1}`;
    const tab = el(
      "button",
      {
        type: "button",
        class: "oneof-tab" + (i === 0 ? " active" : ""),
        role: "tab",
      },
      label,
    );
    const panel = el("div", {
      class: "oneof-panel" + (i === 0 ? " active" : ""),
    });

    if (nv["x-description"])
      panel.append(el("span", { class: "field-desc" }, nv["x-description"]));

    if (nv.properties) {
      const reqFields = nv.required || [];
      Object.entries(nv.properties).forEach(([k, s]) => {
        const ns = normalizeSchema(s, root);
        panel.append(
          renderField(
            ns,
            k,
            [...path, `oneof${i}`, k],
            reqFields.includes(k),
            root,
          ),
        );
      });
    }

    tab.addEventListener("click", () => {
      tabsEl
        .querySelectorAll(".oneof-tab")
        .forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      panel.classList.add("active");
    });

    tabsEl.append(tab);
    panels.push(panel);
    container.append(panel);
  });

  container.prepend(tabsEl);
  return container;
}

function renderField(schema, name, path, required, root) {
  const s = normalizeSchema(schema, root);

  if (s.const !== undefined) return renderConstField(s, name, path);

  if (s.enum) return renderEnumField(s, name, path, required);

  if (s.type === "boolean") return renderBooleanField(s, name, path, required);

  if (s.type === "object")
    return renderObjectField(s, name, path, required, root);

  if (s.type === "array")
    return renderArrayField(s, name, path, required, root);

  if (s.type === "number" || s.type === "integer")
    return renderNumberField(s, name, path, required);

  return renderStringField(s, name, path, required);
}

function applyConditionals(schema, form, root) {
  conditionalWatchers = [];
  if (!schema.if || !schema.then) return;

  const ifProps = schema.if.properties || {};
  const ifRequired = schema.if.required || [];
  const thenProps = schema.then?.properties || {};
  const elseProps = schema.else?.properties || {};

  const watchFields = Object.keys(ifProps);

  const check = () => {
    let match = watchFields.every((k) => {
      const input =
        form.querySelector(`[name="${k}"]`) ||
        form.querySelector(`[name="${k}"]:checked`);
      if (!input) return false;
      const val =
        input.type === "radio"
          ? (form.querySelector(`[name="${k}"]:checked`) || {}).value
          : input.value;
      const cond = ifProps[k];
      if (cond.const !== undefined) return val === String(cond.const);
      if (cond.enum) return cond.enum.map(String).includes(String(val));
      return val !== "" && val !== null;
    });

    const conditionalContainer = form.querySelector(
      ".conditional-fields-block",
    );
    if (!conditionalContainer) return;

    conditionalContainer.querySelectorAll(".conditional-field").forEach((f) => {
      const shouldShow = match
        ? Object.keys(thenProps).some((k) => f.dataset.condName === k)
        : Object.keys(elseProps).some((k) => f.dataset.condName === k);
      f.classList.toggle("cond-hidden", !shouldShow);
      f.classList.toggle("cond-visible", shouldShow);
      f.querySelectorAll("input,select,textarea").forEach((inp) => {
        inp.disabled = !shouldShow;
      });
    });
    updateProgress();
  };

  const conditionalBlock = el("div", { class: "conditional-fields-block" });
  const allCondProps = { ...thenProps, ...elseProps };
  const thenReq = schema.then?.required || [];
  const elseReq = schema.else?.required || [];

  Object.entries(allCondProps).forEach(([k, s]) => {
    const ns = normalizeSchema(s, root);
    const isThen = k in thenProps;
    const isReq = isThen ? thenReq.includes(k) : elseReq.includes(k);
    const fieldWrap = el("div", {
      class: "conditional-field cond-hidden",
      "data-cond-name": k,
    });
    fieldWrap.append(renderField(ns, k, [k], isReq, root));
    fieldWrap.querySelectorAll("input,select,textarea").forEach((inp) => {
      inp.disabled = true;
    });
    conditionalBlock.append(fieldWrap);
  });

  form.append(conditionalBlock);

  watchFields.forEach((k) => {
    const inputs = form.querySelectorAll(`[name="${k}"]`);
    inputs.forEach((inp) => inp.addEventListener("change", check));
  });

  conditionalWatchers.push(check);
  check();
}

function applyDependencies(schema, form, root) {
  if (!schema.dependencies) return;
  dependencyWatchers = [];

  Object.entries(schema.dependencies).forEach(([triggerField, dep]) => {
    const check = () => {
      const trigger = form.querySelector(`[name="${triggerField}"]`);
      const val = trigger
        ? trigger.type === "checkbox"
          ? trigger.checked
          : trigger.value
        : null;
      const depBlock = form.querySelector(`.dep-block-${triggerField}`);
      if (!depBlock) return;

      let isActive = false;
      if (typeof dep === "object" && dep.oneOf) {
        isActive = dep.oneOf.some((variant) => {
          const condition = variant.properties?.[triggerField];
          if (!condition) return false;
          if (condition.enum !== undefined)
            return condition.enum.some((v) => String(v) === String(val));
          return true;
        });
      } else if (Array.isArray(dep)) {
        isActive = val !== "" && val !== null && val !== false;
      }

      depBlock.querySelectorAll(".dep-conditional-field").forEach((f) => {
        const show = isActive;
        f.classList.toggle("cond-hidden", !show);
        f.classList.toggle("cond-visible", show);
        f.querySelectorAll("input,select,textarea").forEach((inp) => {
          inp.disabled = !show;
        });
      });
      updateProgress();
    };

    const trigger = form.querySelector(`[name="${triggerField}"]`);
    if (trigger) {
      trigger.addEventListener("change", check);
      dependencyWatchers.push(check);
      check();
    }
  });
}

function buildSectionFromSchema(schema, root) {
  const section = el("div", { class: "form-section" });
  const hd = el("div", { class: "form-section-hd" });
  const titleWrap = el("div", {});
  const titleEl = el(
    "div",
    { class: "section-legend" },
    schema.title || "Form",
  );
  titleWrap.append(titleEl);
  if (schema.description) {
    titleWrap.append(el("div", { class: "section-desc" }, schema.description));
  }
  hd.append(titleWrap);
  section.append(hd);

  const body = el("div", { class: "form-section-body" });

  if (schema.properties) {
    const reqFields = schema.required || [];
    Object.entries(schema.properties).forEach(([k, s]) => {
      const ns = normalizeSchema(s, root);
      body.append(renderField(ns, k, [k], reqFields.includes(k), root));
    });
  }

  section.append(body);
  return section;
}

function collectFormData(form, schema, root) {
  const result = {};
  const s = normalizeSchema(schema, root);

  if (!s.properties) return result;

  Object.entries(s.properties).forEach(([k, fieldSchema]) => {
    const ns = normalizeSchema(fieldSchema, root);

    if (ns.type === "object" && ns.properties) {
      const sub = {};
      Object.entries(ns.properties).forEach(([sk, ss]) => {
        const sns = normalizeSchema(ss, root);
        sub[sk] = extractField(form, sns, `${k}.${sk}`, root);
      });
      result[k] = sub;
    } else if (ns.type === "array") {
      result[k] = extractArrayField(form, ns, k, root);
    } else {
      const val = extractField(form, ns, k, root);
      if (val !== undefined && val !== "") result[k] = val;
    }
  });

  const conditionalBlock = form.querySelector(".conditional-fields-block");
  if (conditionalBlock) {
    conditionalBlock
      .querySelectorAll(".conditional-field.cond-visible")
      .forEach((f) => {
        const name = f.dataset.condName;
        if (name) {
          const inp = f.querySelector(`[name="${name}"]`);
          if (inp && !inp.disabled)
            result[name] = inp.type === "checkbox" ? inp.checked : inp.value;
        }
      });
  }

  return result;
}

function extractField(form, schema, path, root) {
  const ns = normalizeSchema(schema, root);
  const inp = form.querySelector(`[name="${path}"]`);
  if (!inp) {
    const radio = form.querySelector(`[name="${path}"]:checked`);
    if (radio)
      return ns.type === "boolean" ? radio.value === "true" : radio.value;
    return undefined;
  }
  if (inp.type === "checkbox") return inp.checked;
  if (inp.type === "number" || inp.type === "range")
    return inp.value
      ? ns.type === "integer"
        ? parseInt(inp.value, 10)
        : parseFloat(inp.value)
      : undefined;
  if (ns.enum && !inp.value) return undefined;
  return inp.value || undefined;
}

function extractArrayField(form, schema, path, root) {
  const arrayWrap =
    form.querySelector(`[id^="arrwrap-field-${path}"]`) ||
    form.querySelector(`[data-path="${path}"] .array-wrap`);
  if (!arrayWrap) {
    const checkboxes = form.querySelectorAll(`[name="${path}[]"]:checked`);
    if (checkboxes.length) return [...checkboxes].map((c) => c.value);
    return [];
  }

  const items = arrayWrap.querySelectorAll(".array-item");
  const itemSchema = normalizeSchema(
    schema.items || { type: "string" },
    rootSchema,
  );
  const result = [];

  items.forEach((item, i) => {
    if (itemSchema.type === "object" && itemSchema.properties) {
      const obj = {};
      Object.entries(itemSchema.properties).forEach(([k]) => {
        const inp = item.querySelector(`[name="${path}.${i}.${k}"]`);
        if (inp) obj[k] = inp.type === "checkbox" ? inp.checked : inp.value;
      });
      result.push(obj);
    } else {
      const inp = item.querySelector(`[name="${path}.${i}"]`);
      if (inp)
        result.push(inp.type === "number" ? Number(inp.value) : inp.value);
    }
  });
  return result;
}

function validateForm(form, schema, root) {
  const errors = [];
  const inputs = form.querySelectorAll(
    "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])",
  );

  inputs.forEach((inp) => {
    const isValid = validateInput(
      inp,
      getSchemaForInput(inp, schema, root),
      `field-${inp.name?.replace(/\./g, "-")}`,
    );
    if (!isValid) errors.push(inp.name || "unknown");
  });

  const reqFields = schema.required || [];
  reqFields.forEach((k) => {
    const inp = form.querySelector(`[name="${k}"]`);
    const radio = form.querySelector(`[name="${k}"]:checked`);
    if (!inp && !radio) return;
    if (inp && !inp.value && inp.type !== "checkbox") {
      showError(`field-${k}`, "This field is required");
      errors.push(k);
    }
  });

  return errors;
}

function getSchemaForInput(input, schema, root) {
  const nameParts = (input.name || "").replace(/\[\]/g, "").split(".");
  let s = schema;
  for (const part of nameParts) {
    if (!s) break;
    const ns = normalizeSchema(s, root);
    if (ns.properties && ns.properties[part])
      s = normalizeSchema(ns.properties[part], root);
    else if (ns.items) s = normalizeSchema(ns.items, root);
    else {
      s = {};
      break;
    }
  }
  return s || {};
}

function updateProgress() {
  const form = document.getElementById("generatedForm");
  if (!form || !formSchema) return;
  const allInputs = [
    ...form.querySelectorAll(
      "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])",
    ),
  ];
  const filled = allInputs.filter((inp) => {
    if (inp.type === "radio")
      return !!form.querySelector(`[name="${inp.name}"]:checked`);
    if (inp.type === "checkbox") return true;
    return inp.value !== "";
  });
  const pct = allInputs.length
    ? Math.round((filled.length / allInputs.length) * 100)
    : 0;
  const label = document.getElementById("progressLabel");
  const fill = document.getElementById("progressFill");
  if (label) label.textContent = `${pct}%`;
  if (fill) fill.style.width = pct + "%";
}

function syntaxHighlightJSON(json) {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "json-num";
        if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-str";
        else if (/true|false/.test(match)) cls = "json-bool";
        else if (/null/.test(match)) cls = "json-null";
        return `<span class="${cls}">${match}</span>`;
      },
    );
}

function updateGutter(textarea, gutter) {
  const lines = (textarea.value.match(/\n/g) || []).length + 1;
  const existing = gutter.children.length;
  if (existing === lines) return;
  gutter.innerHTML = Array.from(
    { length: lines },
    (_, i) => `<div>${i + 1}</div>`,
  ).join("");
}

function buildForm(schema) {
  rootSchema = schema;
  formSchema = schema;
  conditionalWatchers = [];
  dependencyWatchers = [];
  arrayCounters = {};

  const form = document.getElementById("generatedForm");
  const empty = document.getElementById("formEmpty");
  const actions = document.getElementById("formActions");
  const titleEl = document.getElementById("formTitle");
  const output = document.getElementById("outputDrawer");

  form.innerHTML = "";
  output.classList.add("hidden");

  const section = buildSectionFromSchema(schema, schema);
  form.append(section);

  if (schema.oneOf && schema.oneOf.length) {
    const oneofSection = el("div", { class: "form-section" });
    const oneofHd = el("div", { class: "form-section-hd" });
    oneofHd.append(
      el("div", { class: "section-legend" }, "Authentication Method"),
    );
    oneofSection.append(oneofHd);
    const body = el("div", { class: "form-section-body" });
    body.append(renderOneOfField(schema, ["auth"], schema));
    oneofSection.append(body);
    form.append(oneofSection);
  }

  applyConditionals(schema, form, schema);
  applyDependencies(schema, form, schema);

  form.querySelectorAll("input, select, textarea").forEach((inp) => {
    inp.addEventListener("input", updateProgress);
    inp.addEventListener("change", updateProgress);
  });

  empty.classList.add("hidden");
  form.classList.remove("hidden");
  actions.classList.remove("hidden");
  titleEl.textContent = schema.title || "Generated Form";

  updateProgress();
  clearBanner();
}

function clearBanner() {
  const b = document.getElementById("validationBanner");
  b.className = "validation-banner hidden";
  b.textContent = "";
}

function showBanner(type, msg) {
  const b = document.getElementById("validationBanner");
  b.className = `validation-banner ${type}`;
  b.textContent = msg;
}

function parseSchema(text) {
  const errChip = document.getElementById("schemaErrChip");
  const okChip = document.getElementById("schemaOkChip");
  errChip.classList.add("hidden");
  okChip.classList.add("hidden");
  document.getElementById("schemaEditor").classList.remove("has-error");

  try {
    const parsed = JSON.parse(text);
    okChip.classList.remove("hidden");
    return parsed;
  } catch (e) {
    errChip.classList.remove("hidden");
    errChip.title = e.message;
    document.getElementById("schemaEditor").classList.add("has-error");
    return null;
  }
}

function initResizer() {
  const resizer = document.getElementById("panelResizer");
  const left = document.querySelector(".panel-schema");
  const workspace = document.querySelector(".workspace");
  let dragging = false,
    startX = 0,
    startW = 0;

  resizer.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = left.getBoundingClientRect().width;
    resizer.classList.add("dragging");
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const totalW = workspace.getBoundingClientRect().width;
    const newW = Math.max(200, Math.min(totalW - 200, startW + dx));
    left.style.flex = `0 0 ${newW}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove("dragging");
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  });
}

function initTooltips() {
  const tooltip = document.getElementById("globalTooltip");
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[title]");
    if (!t || !t.title) return;
    tooltip.textContent = t.title;
    tooltip.classList.add("show");
  });
  document.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.clientX + 12 + "px";
    tooltip.style.top = e.clientY - 28 + "px";
  });
  document.addEventListener("mouseout", (e) => {
    if (!e.target.closest("[title]")) tooltip.classList.remove("show");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("schemaEditor");
  const gutter = document.getElementById("editorGutter");
  const preset = document.getElementById("presetSelect");
  const btnBuild = document.getElementById("btnBuild");
  const btnFormat = document.getElementById("btnFormat");
  const btnMinify = document.getElementById("btnMinify");
  const btnReset = document.getElementById("btnReset");
  const btnValidate = document.getElementById("btnValidate");
  const btnSubmit = document.getElementById("btnSubmit");
  const btnToggleOut = document.getElementById("btnToggleOutput");
  const btnCopyOutput = document.getElementById("btnCopyOutput");
  const btnCloseOutput = document.getElementById("btnCloseOutput");
  const generatedForm = document.getElementById("generatedForm");
  const outputDrawer = document.getElementById("outputDrawer");
  const outputPre = document.getElementById("outputPre");
  const schemaLines = document.getElementById("schemaLines");

  initResizer();
  initTooltips();

  function loadPreset(key) {
    const schema = PRESETS[key];
    if (!schema) return;
    const json = JSON.stringify(schema, null, 2);
    editor.value = json;
    updateGutter(editor, gutter);
    parseSchema(json);
    updateLineCount();
    buildForm(schema);
  }

  function updateLineCount() {
    const lines = (editor.value.match(/\n/g) || []).length + 1;
    schemaLines.textContent = `${lines} lines`;
    updateGutter(editor, gutter);
  }

  editor.addEventListener("input", () => {
    updateLineCount();
    parseSchema(editor.value);
  });

  editor.addEventListener("scroll", () => {
    gutter.scrollTop = editor.scrollTop;
  });

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value =
        editor.value.slice(0, s) +
        "  " +
        editor.value.slice(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 2;
    }
  });

  preset.addEventListener("change", () => loadPreset(preset.value));

  btnBuild.addEventListener("click", () => {
    const parsed = parseSchema(editor.value);
    if (!parsed) {
      showBanner("error", "⚠ Cannot build — fix JSON parse errors first");
      return;
    }
    buildForm(parsed);
  });

  btnFormat.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 2);
      updateLineCount();
      parseSchema(editor.value);
    } catch {}
  });

  btnMinify.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed);
      updateLineCount();
    } catch {}
  });

  btnReset.addEventListener("click", () => {
    if (!formSchema) return;
    generatedForm
      .querySelectorAll("input:not([type=hidden]),select,textarea")
      .forEach((inp) => {
        if (inp.type === "checkbox" || inp.type === "radio")
          inp.checked = false;
        else inp.value = inp.dataset.default || "";
        inp.classList.remove("invalid", "valid");
        clearError(`field-${inp.name?.replace(/\./g, "-")}`);
      });
    generatedForm.querySelectorAll(".array-item").forEach((i) => i.remove());
    clearBanner();
    updateProgress();
    outputDrawer.classList.add("hidden");
    conditionalWatchers.forEach((fn) => fn());
    dependencyWatchers.forEach((fn) => fn());
  });

  btnValidate.addEventListener("click", () => {
    if (!formSchema) return;
    const errors = validateForm(generatedForm, formSchema, rootSchema);
    if (errors.length) {
      showBanner(
        "error",
        `⚠ ${errors.length} validation error${errors.length !== 1 ? "s" : ""} found`,
      );
      generatedForm
        .querySelector(".invalid")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      showBanner("success", `✓ All fields valid`);
    }
  });

  generatedForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!formSchema) return;
    const errors = validateForm(generatedForm, formSchema, rootSchema);
    if (errors.length) {
      showBanner(
        "error",
        `⚠ Fix ${errors.length} error${errors.length !== 1 ? "s" : ""} before submitting`,
      );
      generatedForm
        .querySelector(".invalid")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const data = collectFormData(generatedForm, formSchema, rootSchema);
    const json = JSON.stringify(data, null, 2);
    outputPre.innerHTML = syntaxHighlightJSON(json);
    outputDrawer.classList.remove("hidden");
    outputDrawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    showBanner("success", "✓ Form submitted successfully");
  });

  btnToggleOut.addEventListener("click", () => {
    if (outputDrawer.classList.contains("hidden")) {
      const data = formSchema
        ? collectFormData(generatedForm, formSchema, rootSchema)
        : {};
      outputPre.innerHTML = syntaxHighlightJSON(JSON.stringify(data, null, 2));
      outputDrawer.classList.remove("hidden");
      btnToggleOut.textContent = "Hide Output";
    } else {
      outputDrawer.classList.add("hidden");
      btnToggleOut.textContent = "Show Output";
    }
  });

  btnCopyOutput.addEventListener("click", async () => {
    const text = outputPre.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btnCopyOutput.textContent = "Copied!";
      setTimeout(() => {
        btnCopyOutput.textContent = "Copy";
      }, 1500);
    } catch {
      btnCopyOutput.textContent = "Failed";
    }
  });

  btnCloseOutput.addEventListener("click", () => {
    outputDrawer.classList.add("hidden");
    btnToggleOut.textContent = "Show Output";
  });

  loadPreset("user");
});
