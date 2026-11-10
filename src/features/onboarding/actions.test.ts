import { describe, expect, it } from "vite-plus/test";
import { useUiStore } from "@/store/ui";
import { openSampleProject } from "./actions";

describe("openSampleProject", () => {
  it("leaves previous-year editing mode when opening the sample", () => {
    useUiStore.getState().setEditingPrevious(true);
    openSampleProject();
    expect(useUiStore.getState().editingPrevious).toBe(false);
  });
});
