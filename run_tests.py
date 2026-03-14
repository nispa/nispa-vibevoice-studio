import subprocess
import os
import sys

def run_command(command, cwd=None, env=None, label=""):
    print(f"\n>>> Running {label}...")
    try:
        # On Windows, we need shell=True for some commands like npm
        result = subprocess.run(command, cwd=cwd, env=env, shell=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Error running {label}: {e}")
        return False

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # Prepare environment for backend
    be_env = os.environ.copy()
    be_env["PYTHONPATH"] = "backend"
    
    results = {}

    print("=======================================")
    print("   Nispa Studio Global Test Runner")
    print("=======================================")

    # 1. Backend Pytest
    results["Backend API/Core"] = run_command(
        ["pytest", "backend/tests"], 
        cwd=root_dir, 
        env=be_env, 
        label="Backend Pytest"
    )

    # 2. Scripts Unittest
    results["Install Scripts"] = run_command(
        [sys.executable, "backend/tests/test_scripts.py"], 
        cwd=root_dir, 
        label="Script Unittests"
    )

    # 3. Frontend Vitest
    results["Frontend UI"] = run_command(
        ["npm", "test", "--", "--run"], 
        cwd=frontend_dir, 
        label="Frontend Vitest"
    )

    # Final Summary
    print("\n" + "="*39)
    print("           TEST SUMMARY")
    print("="*39)
    all_passed = True
    for test_name, passed in results.items():
        status = "PASSED [✓]" if passed else "FAILED [✗]"
        print(f"{test_name:<25}: {status}")
        if not passed:
            all_passed = False
    print("="*39)

    if all_passed:
        print("TOTAL STATUS: SUCCESSFUL")
        sys.exit(0)
    else:
        print("TOTAL STATUS: FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
