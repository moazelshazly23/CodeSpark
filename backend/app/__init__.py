"""
Code Spark Application Package
Includes seamless path resolver for Linux/container environments.
"""
import sys
import os
import importlib.abc
import importlib.machinery

class _CodeSparkPathImporter(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if not fullname.startswith("app"):
            return None
        subname = fullname.split(".")[-1]
        search_paths = path if path is not None else sys.path
        for base in search_paths:
            # Package candidate
            pkg_dir = os.path.join(base, subname)
            init_candidate = os.path.join(pkg_dir, "__init__.py")
            if os.path.exists(init_candidate):
                loader = importlib.machinery.SourceFileLoader(fullname, init_candidate)
                spec = importlib.machinery.ModuleSpec(fullname, loader, origin=init_candidate, is_package=True)
                spec.submodule_search_locations = [pkg_dir]
                return spec
            
            # Module candidate
            py_candidate = os.path.join(base, f"{subname}.py")
            if os.path.exists(py_candidate):
                loader = importlib.machinery.SourceFileLoader(fullname, py_candidate)
                return importlib.machinery.ModuleSpec(fullname, loader, origin=py_candidate)
        return None

if not any(isinstance(x, _CodeSparkPathImporter) for x in sys.meta_path):
    sys.meta_path.insert(0, _CodeSparkPathImporter())
