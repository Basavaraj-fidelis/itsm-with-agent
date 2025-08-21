
#!/usr/bin/env python3
"""
Test script for modular system architecture
"""

import sys
import logging
from system_collector import SystemCollector

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_modular_system():
    """Test the modular system collector"""
    print("Testing Modular System Collector")
    print("=" * 50)
    
    try:
        # Initialize collector
        collector = SystemCollector()
        
        # Check if modular system is being used
        if collector.use_modular:
            print("✓ Modular architecture loaded successfully")
            
            # Test module status
            module_status = collector.get_module_status()
            print(f"\nAvailable modules: {len(module_status)}")
            for name, status in module_status.items():
                enabled = "✓" if status['enabled'] else "✗"
                print(f"  {enabled} {name}")
            
            # Test failed modules
            failed = collector.module_manager.get_failed_modules()
            if failed:
                print(f"\nFailed modules: {failed}")
            else:
                print("\n✓ All modules initialized successfully")
        else:
            print("⚠ Using legacy architecture (modular not available)")
        
        # Test data collection
        print("\nTesting data collection...")
        data = collector.collect_all()
        
        if data:
            print(f"✓ Data collection successful")
            print(f"  - Timestamp: {data.get('timestamp', 'N/A')}")
            print(f"  - Hostname: {data.get('hostname', 'N/A')}")
            print(f"  - Collection method: {'Modular' if data.get('_collection_status', {}).get('modular') else 'Legacy'}")
            
            # Show collected sections
            sections = [k for k in data.keys() if not k.startswith('_')]
            print(f"  - Collected sections: {len(sections)}")
            for section in sections[:10]:  # Show first 10
                print(f"    • {section}")
            if len(sections) > 10:
                print(f"    ... and {len(sections) - 10} more")
        else:
            print("✗ Data collection failed")
            return False
        
        print("\n" + "=" * 50)
        print("✓ Modular system test completed successfully")
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_modular_system()
    sys.exit(0 if success else 1)
