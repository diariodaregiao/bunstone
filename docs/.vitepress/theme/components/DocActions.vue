<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useData, useRoute } from "vitepress";

type CopyButtonLabels = {
  idle: string;
  success: string;
  unavailable: string;
  error: string;
};

type ThemeConfigWithDocs = {
  docSources?: Record<string, string>;
  copyPageButton?: CopyButtonLabels;
};

const route = useRoute();
const { site } = useData();
const copied = ref(false);
const failed = ref(false);
let resetTimer: number | undefined;

const fallbackLabels: CopyButtonLabels = {
  idle: "Copy page",
  success: "Page copied",
  unavailable: "MD unavailable",
  error: "Copy failed",
};

const themeConfig = computed(() => site.value.themeConfig as ThemeConfigWithDocs);
const labels = computed(() => themeConfig.value.copyPageButton ?? fallbackLabels);

function normalizePath(rawPath: string): string {
  const [pathWithoutQuery] = rawPath.split(/[?#]/);
  const withoutHtml = pathWithoutQuery.replace(/\.html$/, "");
  const withoutIndex = withoutHtml.replace(/\/index$/, "/");

  if (withoutIndex.length > 1 && withoutIndex.endsWith("/")) {
    return withoutIndex.slice(0, -1);
  }

  return withoutIndex || "/";
}

const source = computed(() => {
  const normalizedPath = normalizePath(route.path);
  return themeConfig.value.docSources?.[normalizedPath] ?? "";
});

const hasSource = computed(() => !!source.value);

const copyButtonLabel = computed(() => {
  if (!source.value) return labels.value.unavailable;
  if (failed.value) return labels.value.error;
  if (copied.value) return labels.value.success;
  return labels.value.idle;
});

const copyButtonState = computed(() => {
  if (!source.value) return "unavailable";
  if (failed.value) return "error";
  if (copied.value) return "success";
  return "idle";
});

const mdFileName = computed(() => {
  const p = normalizePath(route.path);
  const parts = p.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "index";
  return `${last}.md`;
});

const mdHref = computed(() => {
  if (!source.value) return "#";
  const blob = new Blob([source.value], { type: "text/markdown" });
  return URL.createObjectURL(blob);
});

const htmlHref = computed(() => {
  const p = normalizePath(route.path);
  if (p === "/") return "/index.html";
  return `${p}.html`;
});

function scheduleReset() {
  if (typeof window === "undefined") return;
  window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    copied.value = false;
    failed.value = false;
  }, 2000);
}

onBeforeUnmount(() => {
  if (typeof window !== "undefined") window.clearTimeout(resetTimer);
});

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("Clipboard API unavailable");
}

async function copyMarkdown() {
  if (!source.value) {
    failed.value = true;
    copied.value = false;
    scheduleReset();
    return;
  }
  try {
    await writeToClipboard(source.value);
    copied.value = true;
    failed.value = false;
  } catch {
    copied.value = false;
    failed.value = true;
  }
  scheduleReset();
}
</script>

<template>
  <div class="doc-actions">
    <!-- Copy as MD button -->
    <button
      class="doc-action-btn"
      :class="`doc-action-btn--${copyButtonState}`"
      type="button"
      :disabled="!hasSource"
      :aria-label="copyButtonLabel"
      @click="copyMarkdown"
    >
      <span class="doc-action-btn__icon" aria-hidden="true">
        <!-- success -->
        <svg v-if="copyButtonState === 'success'" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.5 6.5 11.5 12.5 5.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" />
        </svg>
        <!-- error / unavailable -->
        <svg v-else-if="copyButtonState === 'error' || copyButtonState === 'unavailable'" viewBox="0 0 16 16" fill="none">
          <path d="M8 5.25V8.25" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
          <circle cx="8" cy="11.25" r="0.75" fill="currentColor" />
          <path d="M7.134 2.5C7.519 1.833 8.481 1.833 8.866 2.5L13.63 10.75C14.014 11.417 13.533 12.25 12.763 12.25H3.237C2.467 12.25 1.986 11.417 2.371 10.75L7.134 2.5Z" stroke="currentColor" stroke-width="1.25" />
        </svg>
        <!-- idle -->
        <svg v-else viewBox="0 0 16 16" fill="none">
          <rect x="5.25" y="2.5" width="7.25" height="9.25" rx="1.75" stroke="currentColor" stroke-width="1.25" />
          <path d="M3.5 5.25V11.5C3.5 12.328 4.172 13 5 13H10.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.25" />
        </svg>
      </span>
      <span class="doc-action-btn__label">{{ copyButtonLabel }}</span>
      <span class="doc-action-btn__badge" aria-hidden="true">MD</span>
    </button>

    <!-- Download .md -->
    <a
      v-if="hasSource"
      class="doc-action-btn doc-action-btn--idle"
      :href="mdHref"
      :download="mdFileName"
      :aria-label="`Download ${mdFileName}`"
    >
      <span class="doc-action-btn__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M8 2.5V10.5M8 10.5L5.5 8M8 10.5L10.5 8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25" />
          <path d="M3 13H13" stroke="currentColor" stroke-linecap="round" stroke-width="1.25" />
        </svg>
      </span>
      <span class="doc-action-btn__label">Download</span>
      <span class="doc-action-btn__badge" aria-hidden="true">MD</span>
    </a>

  </div>
</template>
