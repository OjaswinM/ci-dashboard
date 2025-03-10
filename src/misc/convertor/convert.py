import xml.etree.ElementTree as ET
import json
from datetime import datetime
import os
import zipfile
import glob

def parse_xunit_xml(xml_file_path: str, results_dir: str, output_dir: str) -> dict:
    tree = ET.parse(xml_file_path)
    root = tree.getroot()

    # Extracting global run information
    test_type = root.attrib.get('name')
    run_id = root.attrib.get('timestamp')
    subtype = root.find(".//property[@name='FSTESTSET']").attrib.get('value')
    kernel_release = root.find(".//property[@name='KERNEL']").attrib.get('value').split()[1]
    #distro = root.find(".//property[@name='zz_build-distro']").attrib.get('value')

    # Assuming vmlinux_path and config_path are not in XML, setting as empty for now
    environment = {
        "vmlinux_path": "",
        "config_path": "",
        "distro": "sample-distro",
        "kernel_release": kernel_release
    }

    # Parsing test cases
    tests = dict()
    for testcase in root.findall('testcase'):
        name = testcase.attrib.get('name')
        duration = float(testcase.attrib.get('time', 0))

        # Create zip file for logs
        log_prefix = os.path.join(results_dir, name)
        zip_filename = f"{os.path.join(os.getcwd(), output_dir, name.replace('/', '-') + '.zip')}"
        with zipfile.ZipFile(zip_filename, 'w') as zipf:
            #print(f"Looking for logs in: {log_prefix}.*")
            #print(f"Found files: {glob.glob(f'{log_prefix}.*')}")
            for log_file in glob.glob(f"{log_prefix}.*"):
                zipf.write(log_file, os.path.basename(log_file))

        # Determine status
        if testcase.find('failure') is not None:
            status = 'fail'
        elif testcase.find('skipped') is not None:
            status = 'skip'
        else:
            status = 'pass'

        # Update status only if it is a fail and not already a fail
        if name in tests:
            if status == 'fail' and tests[name]['status'] != 'fail':
                tests[name]['status'] = status
        else:
            tests[name] = {
                "name": name,
                "status": status,
                "duration": duration,
                "log": zip_filename
            }

    test_list = []
    for val in tests.values():
        test_list.append(val)

    # Constructing the final JSON object
    result = {
        "test_types": [
            {
                "type": test_type,
                "subtype": {
                        "name": subtype,
                        "runs": [
                            {
                                "run_id": run_id,
                                "tests": test_list,
                                "environment": environment
                            }
                        ]
                    }
            }
        ]
    }

    return result

# Example usage
if __name__ == '__main__':
    result = parse_xunit_xml('results.xml', "./results-dir", "./output-dir")
    print(json.dumps(result, indent=4))
