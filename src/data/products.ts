import { ProductInfo } from '../interfaces/Product';

export const ARCAD_PRODUCTS: Record<string, ProductInfo> = {
  "ARCAD-Skipper": {
    url: "https://www.arcadsoftware.com/products/arcad-skipper/",
    description: "Application analysis and documentation tool for IBM i modernization",
    category: "Modernization",
    keyFeatures: [
      "Cross-reference database for IBM i applications",
      "Impact analysis for code changes",
      "Automated documentation generation",
      "Code quality metrics and analysis",
      "Integration with DevOps tools"
    ],
    relatedProducts: ["ARCAD-Observer", "ARCAD-Transformer"],
    technicalDetails: {
      platforms: ["IBM i"],
      integrations: ["Git", "Jenkins", "ARCAD-Observer"]
    }
  },
  "ARCAD-Observer": {
    url: "https://www.arcadsoftware.com/products/arcad-observer/",
    description: "Real-time application monitoring and performance analysis",
    category: "DevOps",
    keyFeatures: [
      "Real-time application monitoring",
      "Performance metrics tracking",
      "Resource usage analysis",
      "Bottleneck identification",
      "Integration with CI/CD pipelines"
    ],
    relatedProducts: ["ARCAD-Skipper", "ARCAD-Deliver"],
    technicalDetails: {
      platforms: ["IBM i"],
      integrations: ["Jenkins", "Grafana", "ELK Stack"]
    }
  },
  "ARCAD-Verifier": {
    url: "https://www.arcadsoftware.com/products/arcad-verifier/",
    description: "Quality assurance and testing solution for IBM i applications",
    category: "Testing",
    keyFeatures: [
      "Automated testing capabilities",
      "Test coverage analysis",
      "Regression testing",
      "Integration with CI/CD pipelines"
    ]
  },
  "ARCAD-Transformer": {
    url: "https://www.arcadsoftware.com/products/arcad-transformer/",
    description: "Comprehensive modernization suite for IBM i applications",
    category: "Modernization",
    keyFeatures: [
      "RPG code conversion",
      "Database modernization",
      "User interface modernization",
      "Code refactoring tools"
    ]
  },
  "ARCAD-Listener": {
    url: "https://www.arcadsoftware.com/products/arcad-listener/",
    description: "Real-time change tracking and version control for IBM i",
    category: "DevOps",
    keyFeatures: [
      "Source code change monitoring",
      "Git integration",
      "Version control management",
      "Change history tracking"
    ]
  },
  "ARCAD-CodeChecker": {
    url: "https://www.arcadsoftware.com/products/arcad-codechecker/",
    description: "Code quality and standards enforcement tool",
    category: "DevOps",
    keyFeatures: [
      "Code quality analysis",
      "Coding standards enforcement",
      "Automated code reviews",
      "Quality metrics reporting"
    ]
  },
  "ARCAD-API": {
    url: "https://www.arcadsoftware.com/products/arcad-api/",
    description: "API management and development solution",
    category: "Integration",
    keyFeatures: [
      "API creation and management",
      "REST API development",
      "API documentation",
      "Integration capabilities"
    ]
  },
  "ARCAD-Builder": {
    url: "https://www.arcadsoftware.com/products/arcad-builder/",
    description: "Build and deployment automation for IBM i",
    category: "DevOps",
    keyFeatures: [
      "Automated builds",
      "Deployment automation",
      "Build pipeline integration",
      "Version management"
    ]
  },
  "ARCAD iUnit": {
    url: "https://www.arcadsoftware.com/arcad/products/arcad-iunit-ibm-i-unit-testing/",
    description: "Unit testing framework for IBM i applications",
    category: "Testing",
    keyFeatures: [
      "Automated unit testing",
      "Test case management",
      "Test coverage analysis",
      "Integration with CI/CD"
    ]
  },
  "ARCAD Transformer DB": {
    url: "https://www.arcadsoftware.com/arcad/products/arcad-transformer-db-database-modernization/",
    description: "Database modernization solution for IBM i",
    category: "Modernization",
    keyFeatures: [
      "Database structure analysis",
      "Data migration tools",
      "Schema modernization",
      "Data quality validation"
    ]
  },
  "DOT Anonymizer": {
    url: "https://www.arcadsoftware.com/dot/data-masking/dot-anonymizer/",
    description: "Data masking and anonymization solution",
    category: "Security",
    keyFeatures: [
      "Data privacy protection",
      "Compliance management",
      "Test data generation",
      "Sensitive data handling"
    ]
  }
};

// Convert product info to simple URL map for backward compatibility
export const ARCAD_PRODUCT_MAP: { [key: string]: string } = Object.entries(ARCAD_PRODUCTS).reduce((acc, [key, value]) => {
  acc[key] = value.url;
  return acc;
}, {} as { [key: string]: string });