"""
Test runner for Nispa VibeVoice Studio.
Usage:
    python run_tests.py              # run all tests
    python run_tests.py --backend    # backend only
    python run_tests.py --frontend   # frontend only
"""
import subprocess
import sys
import os


def run(cmd, cwd=None, env=None):
    result = subprocess.run(cmd, cwd=cwd, env=env)
    return result.returncode == 0


def backend_tests():
    print("\n=== Backend tests ===")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.join("backend")
    return run(
        [sys.executable, "-m", "pytest", "backend/tests", "-v", "--tb=short"],
        env=env,
    )


def frontend_tests():
    print("\n=== Frontend tests ===")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("  node_modules not found — run 'npm install' in frontend/ first")
        return False
    return run(["npm", "run", "test", "--", "--run"], cwd=frontend_dir)


if __name__ == "__main__":
    args = sys.argv[1:]
    run_backend  = "--frontend" not in args
    run_frontend = "--backend"  not in args

    results = {}
    if run_backend:
        results["backend"] = backend_tests()
    if run_frontend:
        results["frontend"] = frontend_tests()

    print("\n=== Results ===")
    all_passed = True
    for suite, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        print(f"  {suite}: {status}")
        if not passed:
            all_passed = False

    sys.exit(0 if all_passed else 1)
