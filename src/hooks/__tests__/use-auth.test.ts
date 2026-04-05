import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsModule from "@/actions/get-projects";
import * as createProjectModule from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("returns the result from signInAction on success", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result from signInAction on failure", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpassword");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("sets isLoading to true while in flight, false after", async () => {
      let resolveSignIn!: (v: any) => void;
      (actions.signIn as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false, error: "Invalid credentials" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with provided credentials", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "mypassword");
      });

      expect(actions.signIn).toHaveBeenCalledWith("test@example.com", "mypassword");
    });

    test("does not call handlePostSignIn when signIn fails", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpassword");
      });

      expect(getProjectsModule.getProjects).not.toHaveBeenCalled();
      expect(createProjectModule.createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("user@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("returns the result from signUpAction on success", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("newuser@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result from signUpAction on failure", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("sets isLoading to true while in flight, false after", async () => {
      let resolveSignUp!: (v: any) => void;
      (actions.signUp as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with provided credentials", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepass");
      });

      expect(actions.signUp).toHaveBeenCalledWith("newuser@example.com", "securepass");
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("user@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post sign-in navigation", () => {
    test("saves anon work as a project and navigates to it when anon work exists with messages", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "export default function App() {}" } },
      };
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(anonWork);
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anon work is saved", async () => {
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ role: "user", content: "Hi" }],
        fileSystemData: {},
      });
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjectsModule.getProjects).not.toHaveBeenCalled();
    });

    test("navigates to existing most recent project when no anon work", async () => {
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "project-1", name: "First" },
        { id: "project-2", name: "Second" },
      ]);
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(createProjectModule.createProject).not.toHaveBeenCalled();
    });

    test("creates a new project and navigates to it when no anon work and no existing projects", async () => {
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fresh-project-id" });
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
    });

    test("skips anon work if it has no messages (empty messages array)", async () => {
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "existing-project" },
      ]);
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(anonTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(getProjectsModule.getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("post sign-up also triggers navigation flow", async () => {
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "existing-project" },
      ]);
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });
  });
});
