
#!/usr/bin/env python3
"""
Comprehensive Agent Test Suite
Runs all agent tests in sequence and provides a summary
"""

import subprocess
import sys
import time
from datetime import datetime

def run_test(test_name, test_file):
    """Run a single test and return the result"""
    
    print(f"\n{'='*60}")
    print(f"Running {test_name}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        success = result.returncode == 0
        
        return {
            'name': test_name,
            'file': test_file,
            'success': success,
            'duration': duration,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
        
    except subprocess.TimeoutExpired:
        print(f"❌ TEST TIMEOUT: {test_name} took longer than 60 seconds")
        return {
            'name': test_name,
            'file': test_file,
            'success': False,
            'duration': 60,
            'stdout': '',
            'stderr': 'Test timed out',
            'returncode': -1
        }
    except Exception as e:
        print(f"❌ TEST ERROR: {e}")
        return {
            'name': test_name,
            'file': test_file,
            'success': False,
            'duration': 0,
            'stdout': '',
            'stderr': str(e),
            'returncode': -1
        }

def main():
    """Run all agent tests"""
    
    print("ITSM Agent Test Suite")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Define tests to run
    tests = [
        ("API Connectivity Test", "test_agent_connectivity.py"),
        ("Agent Heartbeat Test", "test_agent_heartbeat.py"),
        ("Agent Reporting Test", "test_agent_reporting.py"),
    ]
    
    results = []
    
    # Run each test
    for test_name, test_file in tests:
        result = run_test(test_name, test_file)
        results.append(result)
        
        # Small delay between tests
        time.sleep(2)
    
    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r['success'])
    failed_tests = total_tests - passed_tests
    total_duration = sum(r['duration'] for r in results)
    
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Total duration: {total_duration:.2f} seconds")
    print()
    
    # Detailed results
    for result in results:
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"{status} {result['name']} ({result['duration']:.2f}s)")
        
        if not result['success']:
            print(f"      Error: {result['stderr'][:100]}")
    
    print()
    
    if failed_tests == 0:
        print("🎉 All tests passed!")
        print()
        print("Your ITSM agent system is working correctly.")
        print("You can now:")
        print("  1. Deploy agents to your Windows/Linux machines")
        print("  2. Monitor them through the dashboard")
        print("  3. Use remote management features")
        
    else:
        print(f"⚠️  {failed_tests} test(s) failed.")
        print()
        print("Please check the detailed output above and:")
        print("  1. Ensure the ITSM server is running on port 5000")
        print("  2. Check that the authentication token is correct")
        print("  3. Verify network connectivity")
        print("  4. Review any error messages for specific issues")
    
    print()
    print("For more detailed testing, run individual test files:")
    for _, test_file in tests:
        print(f"  python {test_file}")
    
    # Exit with appropriate code
    sys.exit(0 if failed_tests == 0 else 1)

if __name__ == '__main__':
    main()
