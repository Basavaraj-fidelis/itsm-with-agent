
#!/usr/bin/env python3
"""
Comprehensive ITSM Testing Suite
Runs all types of tests: Unit, Integration, Functional, Module-specific, and Performance
"""

import subprocess
import sys
import time
import os
from datetime import datetime

def run_test_suite(test_file, test_name):
    """Run a single test suite and return results"""
    
    print(f"\n{'='*80}")
    print(f"Running {test_name}")
    print(f"{'='*80}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout per test suite
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
        print(f"❌ TEST TIMEOUT: {test_name} took longer than 120 seconds")
        return {
            'name': test_name,
            'file': test_file,
            'success': False,
            'duration': 120,
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

def check_server_status():
    """Check if the ITSM server is running"""
    try:
        import requests
        response = requests.get("http://0.0.0.0:5000/api/health", timeout=10)
        return response.status_code == 200
    except:
        return False

def main():
    """Run comprehensive test suite"""
    
    print("ITSM Comprehensive Testing Suite")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check server status
    if not check_server_status():
        print("⚠️  Warning: ITSM server may not be running on port 5000")
        print("   Some integration and functional tests may fail")
        print()
    
    # Define test suites in order of execution
    test_suites = [
        # Unit Tests (run first - don't need server)
        ("tests/unit/test_storage.py", "Storage Layer Unit Tests"),
        ("tests/unit/test_auth.py", "Authentication Unit Tests"),
        
        # Integration Tests (need server)
        ("tests/integration/test_api_endpoints.py", "API Endpoints Integration Tests"),
        
        # Module Tests (specific functionality)
        ("tests/modules/test_ticket_module.py", "Ticket Management Module Tests"),
        ("tests/modules/test_knowledge_base.py", "Knowledge Base Module Tests"),
        
        # Functional Tests (complete workflows)
        ("tests/functional/test_agent_workflow.py", "Agent Workflow Functional Tests"),
        
        # Performance Tests (run last)
        ("tests/performance/test_load.py", "Performance and Load Tests"),
        
        # Original Agent Tests (if fixed)
        ("test_agent_connectivity.py", "Agent Connectivity Tests"),
        ("test_agent_heartbeat.py", "Agent Heartbeat Tests"),
        ("test_agent_reporting.py", "Agent Reporting Tests"),
    ]
    
    results = []
    
    # Run each test suite
    for test_file, test_name in test_suites:
        if os.path.exists(test_file):
            result = run_test_suite(test_file, test_name)
            results.append(result)
        else:
            print(f"\n⚠️  Skipping {test_name} - file {test_file} not found")
            results.append({
                'name': test_name,
                'file': test_file,
                'success': False,
                'duration': 0,
                'stderr': 'Test file not found',
                'returncode': -2
            })
        
        # Small delay between test suites
        time.sleep(1)
    
    # Print comprehensive summary
    print(f"\n{'='*80}")
    print("COMPREHENSIVE TEST SUMMARY")
    print(f"{'='*80}")
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r['success'])
    failed_tests = total_tests - passed_tests
    total_duration = sum(r['duration'] for r in results)
    
    print(f"Total test suites: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Total duration: {total_duration:.2f} seconds")
    print()
    
    # Categorize results
    unit_tests = [r for r in results if 'Unit' in r['name']]
    integration_tests = [r for r in results if 'Integration' in r['name']]
    functional_tests = [r for r in results if 'Functional' in r['name']]
    module_tests = [r for r in results if 'Module' in r['name']]
    performance_tests = [r for r in results if 'Performance' in r['name']]
    agent_tests = [r for r in results if 'Agent' in r['name']]
    
    # Detailed results by category
    categories = [
        ("Unit Tests", unit_tests),
        ("Integration Tests", integration_tests),
        ("Module Tests", module_tests),
        ("Functional Tests", functional_tests),
        ("Agent Tests", agent_tests),
        ("Performance Tests", performance_tests)
    ]
    
    for category_name, category_results in categories:
        if category_results:
            passed = sum(1 for r in category_results if r['success'])
            total = len(category_results)
            print(f"{category_name}: {passed}/{total} passed")
            
            for result in category_results:
                status = "✅ PASS" if result['success'] else "❌ FAIL"
                print(f"  {status} {result['name']} ({result['duration']:.2f}s)")
                
                if not result['success'] and result['stderr']:
                    error_preview = result['stderr'][:100].replace('\n', ' ')
                    print(f"      Error: {error_preview}...")
            print()
    
    # Final assessment
    if failed_tests == 0:
        print("🎉 All tests passed!")
        print("\nYour ITSM system is working correctly across all tested areas:")
        print("  ✅ Unit tests: Core functionality validated")
        print("  ✅ Integration tests: API endpoints working")
        print("  ✅ Module tests: Feature modules operational")
        print("  ✅ Functional tests: Complete workflows functioning")
        print("  ✅ Agent tests: Agent communication established")
        print("  ✅ Performance tests: System performing adequately")
        
    else:
        print(f"⚠️  {failed_tests} test suite(s) failed.")
        print("\nIssues identified:")
        
        failed_results = [r for r in results if not r['success']]
        for result in failed_results:
            print(f"  ❌ {result['name']}")
            if 'not found' in result['stderr']:
                print(f"      → Test file missing: {result['file']}")
            elif 'requests' in result['stderr']:
                print(f"      → Missing Python dependency: requests")
            elif 'Connection' in result['stderr'] or 'Failed to fetch' in result['stderr']:
                print(f"      → Server connectivity issue")
            else:
                print(f"      → Check detailed logs above")
        
        print("\nRecommended actions:")
        print("  1. Install missing dependencies: pip install requests psutil")
        print("  2. Ensure ITSM server is running on port 5000")
        print("  3. Check network connectivity and authentication")
        print("  4. Review detailed error messages above")
    
    print()
    print("For individual test execution:")
    for test_file, test_name in test_suites:
        if os.path.exists(test_file):
            print(f"  python {test_file}")
    
    # Exit with appropriate code
    sys.exit(0 if failed_tests == 0 else 1)

if __name__ == '__main__':
    main()
