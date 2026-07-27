// Swagger UI runs with full privileges on the API's own origin, including on
// docs pages gated behind basic auth, so the CDN assets are pinned to an exact
// version and locked to a subresource-integrity hash.
const SWAGGER_UI_VERSION = "5.32.11";
const SWAGGER_UI_CSS_SRI =
	"sha384-9Q2fpS+xeS4ffJy6CagnwoUl+4ldAYhOs9pgZuEKxypVModhmZFzeMlvVsAjf7uT";
const SWAGGER_UI_JS_SRI =
	"sha384-vfl/klfTFrIz5urj0HnhcXLAbzPdRHezizfy+XgFB6GqcKkhlk0lS3bIbyB39NLA";

/**
 * The spec path is configuration, but it still ends up inside a `<script>`
 * block: a quote would break out of the string literal and a literal
 * `</script>` would end the element early.
 */
function toScriptLiteral(value: string): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function swaggerUiHtml(specPath: string): string {
	const base = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>API Docs</title>
<link rel="stylesheet" href="${base}/swagger-ui.css" integrity="${SWAGGER_UI_CSS_SRI}" crossorigin="anonymous" />
</head>
<body>
<div id="swagger"></div>
<script src="${base}/swagger-ui-bundle.js" integrity="${SWAGGER_UI_JS_SRI}" crossorigin="anonymous"></script>
<script>
window.onload = () => {
	window.SwaggerUIBundle({ url: ${toScriptLiteral(specPath)}, dom_id: "#swagger" });
};
</script>
</body>
</html>`;
}
