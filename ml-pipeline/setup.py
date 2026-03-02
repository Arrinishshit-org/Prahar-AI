from setuptools import setup, find_packages

setup(
    name='scheme-recommender-ml',
    version='1.0.0',
    description='ML Pipeline for Personalized Scheme Recommendation System',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    python_requires='>=3.10',
    install_requires=[
        'numpy>=1.26.2',
        'pandas>=2.1.4',
        'scikit-learn>=1.3.2',
        'torch>=2.1.2',
        'transformers>=4.36.2',
        'neo4j>=5.15.0',
        'redis>=5.0.1',
        'fastapi>=0.108.0',
        'uvicorn>=0.25.0',
        'pydantic>=2.5.3',
        'python-dotenv>=1.0.0',
        'requests>=2.31.0',
    ],
    extras_require={
        'dev': [
            'pytest>=7.4.3',
            'hypothesis>=6.92.2',
            'black>=23.12.1',
            'flake8>=7.0.0',
            'mypy>=1.8.0',
        ]
    }
)
